import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { workspaceDb, type CanvasNote, type WorkspaceClient, mirrorProfile } from "@/integrations/workspace/client";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles, Flame, Lightbulb, Briefcase, CheckCircle2, Loader2, Plus, Trash2, Wand2, ZoomIn, ZoomOut, Move, Copy } from "lucide-react";
import { toast } from "sonner";
import { enforceLimit } from "@/lib/tool-limits";

type Color = CanvasNote["color"];

const COLOR_META: Record<Color, { bg: string; ring: string; label: string; icon: any }> = {
  red:    { bg: "bg-rose-200",   ring: "ring-rose-400",   label: "Hot — closing now",   icon: Flame },
  yellow: { bg: "bg-amber-200",  ring: "ring-amber-400",  label: "Lead / ideation",     icon: Lightbulb },
  blue:   { bg: "bg-sky-200",    ring: "ring-sky-400",    label: "Work in progress",    icon: Briefcase },
  green:  { bg: "bg-emerald-200",ring: "ring-emerald-400",label: "Paid / milestone",    icon: CheckCircle2 },
};

export default function HustleCanvas() {
  const { user, profile } = useAuth();
  const [notes, setNotes] = useState<CanvasNote[]>([]);
  const [clients, setClients] = useState<WorkspaceClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState<"unknown" | "ok" | "missing">("unknown");
  const [zoom, setZoom] = useState(1);
  const [actionNote, setActionNote] = useState<CanvasNote | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;
    mirrorProfile({ user_id: user.id, email: user.email, tier: profile?.subscription_tier });
    load();
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const [n, c] = await Promise.all([
      workspaceDb.from("canvas_notes").select("*").eq("owner_id", user.id),
      workspaceDb.from("workspace_clients").select("*").eq("owner_id", user.id),
    ]);
    if (n.error && /relation .* does not exist|schema cache/i.test(n.error.message)) {
      setDbReady("missing");
    } else {
      setDbReady("ok");
      setNotes((n.data as CanvasNote[]) || []);
    }
    if (!c.error) setClients((c.data as WorkspaceClient[]) || []);
    setLoading(false);
  }

  async function addNote(color: Color, text = "New note", x = 200, y = 200, client_id: string | null = null) {
    if (!user) return;
    const { data, error } = await workspaceDb.from("canvas_notes")
      .insert({ owner_id: user.id, text, color, x, y, client_id, last_action_at: new Date().toISOString() })
      .select().single();
    if (error) { toast.error(error.message); return; }
    setNotes(p => [...p, data as CanvasNote]);
  }

  async function updateNote(id: string, patch: Partial<CanvasNote>) {
    setNotes(p => p.map(n => (n.id === id ? { ...n, ...patch } as CanvasNote : n)));
    await workspaceDb.from("canvas_notes").update(patch).eq("id", id).eq("owner_id", user!.id);
  }

  async function deleteNote(id: string) {
    setNotes(p => p.filter(n => n.id !== id));
    await workspaceDb.from("canvas_notes").delete().eq("id", id).eq("owner_id", user!.id);
  }

  function onDragOver(e: React.DragEvent) { e.preventDefault(); }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const clientId = e.dataTransfer.getData("clientId");
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    if (clientId) {
      const c = clients.find(x => x.id === clientId);
      addNote("yellow", c?.name || "Lead", x, y, clientId);
    } else {
      const color = (e.dataTransfer.getData("color") as Color) || "yellow";
      addNote(color, "New note", x, y);
    }
  }

  async function fireAction(note: CanvasNote) {
    setActionNote(note);
    setAiResult(null);
    const linkedClient = clients.find(c => c.id === note.client_id) || null;

    if (note.color === "blue") {
      window.open("https://meet.google.com/new", "_blank");
      await updateNote(note.id, { last_action_at: new Date().toISOString() });
      setActionNote(null);
      return;
    }
    if (note.color === "green") {
      toast.success("Marked as paid — log it in Billing.");
      await updateNote(note.id, { last_action_at: new Date().toISOString() });
      setActionNote(null);
      return;
    }

    const gate = enforceLimit("workspace-ai", user?.id, profile?.subscription_tier);
    if (!gate.ok) { toast.error(`Monthly AI limit reached (${gate.max}). Upgrade to keep going.`); setActionNote(null); return; }

    setAiBusy(true);
    try {
      if (note.color === "red") {
        const { data, error } = await supabase.functions.invoke("workspace-ai", {
          body: { action: "closing_pitch", client: linkedClient || { name: note.text } },
        });
        if (error) throw error;
        setAiResult(data?.pitch || JSON.stringify(data));
      } else {
        // yellow → ideation: pull AI search insight
        const { data, error } = await supabase.functions.invoke("ai-search", {
          body: { query: note.text, mode: "research" },
        });
        if (error) throw error;
        setAiResult(typeof data === "string" ? data : (data?.results?.slice(0, 3).map((r: any) => `• ${r.title}`).join("\n") || JSON.stringify(data).slice(0, 600)));
      }
      await updateNote(note.id, { last_action_at: new Date().toISOString() });
    } catch (e: any) {
      toast.error(e.message || "AI failed");
    } finally {
      setAiBusy(false);
    }
  }

  async function tidyCanvas() {
    const gate = enforceLimit("workspace-ai", user?.id, profile?.subscription_tier);
    if (!gate.ok) { toast.error(`Monthly AI limit reached (${gate.max}).`); return; }
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("workspace-ai", {
        body: { action: "tidy_canvas", notes: notes.map(n => ({ id: n.id, color: n.color, text: n.text, last_action_at: n.last_action_at })) },
      });
      if (error) throw error;
      toast.success(data?.summary || "Canvas tidied");
      // Auto-arrange by zone columns
      const zones = data?.zones || {};
      const cols = ["hot", "ideation", "in_progress", "won", "follow_up"];
      const W = 220;
      cols.forEach((zone, ci) => {
        const ids: string[] = zones[zone] || [];
        ids.forEach((id, ri) => {
          updateNote(id, { x: 80 + ci * W, y: 120 + ri * 130 });
        });
      });
    } catch (e: any) {
      toast.error(e.message || "Tidy failed");
    } finally { setAiBusy(false); }
  }

  const heatmap = useMemo(() => {
    const counts = { red: 0, yellow: 0, blue: 0, green: 0 } as Record<Color, number>;
    notes.forEach(n => { counts[n.color] = (counts[n.color] || 0) + 1; });
    return counts;
  }, [notes]);

  if (dbReady === "missing") {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="p-4 border-amber-300 bg-amber-50">
          <h3 className="font-semibold text-amber-900 mb-1">One-time setup needed</h3>
          <p className="text-sm text-amber-800 mb-2">Run this SQL in your <strong>hustl-production</strong> Supabase SQL editor:</p>
          <pre className="bg-white border border-amber-200 rounded p-3 text-[11px] overflow-x-auto whitespace-pre">{CANVAS_SQL}</pre>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(CANVAS_SQL); toast.success("SQL copied"); }}><Copy className="w-3 h-3 mr-1" />Copy SQL</Button>
            <Button size="sm" onClick={load} className="bg-emerald-600 hover:bg-emerald-700 text-white">I've run it — retry</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-50">
      {/* Toolbar */}
      <div className="px-4 py-2 border-b bg-white flex items-center gap-2 flex-wrap">
        <h1 className="font-display font-bold text-lg text-slate-900 mr-2">Hustle Canvas</h1>
        <Badge className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-0">War Room</Badge>
        <div className="flex items-center gap-1 ml-2">
          {(Object.keys(COLOR_META) as Color[]).map(c => {
            const M = COLOR_META[c];
            return (
              <button
                key={c}
                draggable
                onDragStart={e => e.dataTransfer.setData("color", c)}
                onClick={() => addNote(c)}
                title={M.label}
                className={`w-8 h-8 rounded ${M.bg} ring-1 ${M.ring} flex items-center justify-center hover:scale-110 transition-transform`}
              >
                <M.icon className="w-3.5 h-3.5 text-slate-700" />
              </button>
            );
          })}
        </div>
        <span className="text-xs text-slate-500 ml-1 hidden sm:inline">drag onto canvas or click to add</span>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-600">
            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">🔥 {heatmap.red}</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">💡 {heatmap.yellow}</span>
            <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">🔵 {heatmap.blue}</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">🟢 {heatmap.green}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}><ZoomOut className="w-3.5 h-3.5" /></Button>
          <span className="text-xs text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.min(2, z + 0.1))}><ZoomIn className="w-3.5 h-3.5" /></Button>
          <Button size="sm" onClick={tidyCanvas} disabled={aiBusy} className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90">
            {aiBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5 mr-1" />AI tidy</>}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — clients */}
        <aside className="w-56 border-r bg-white p-3 overflow-y-auto">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Clients</h3>
          {clients.length === 0 && <p className="text-xs text-slate-400">Add clients in Workspaces → drag here.</p>}
          <ul className="space-y-1.5">
            {clients.map(c => (
              <li
                key={c.id}
                draggable
                onDragStart={e => { e.dataTransfer.setData("clientId", c.id); }}
                className="px-2 py-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-grab text-xs"
              >
                <div className="font-medium text-slate-800 truncate">{c.name}</div>
                {c.company && <div className="text-slate-500 truncate text-[10px]">{c.company}</div>}
              </li>
            ))}
          </ul>
        </aside>

        {/* Canvas */}
        <div
          ref={canvasRef}
          onDragOver={onDragOver}
          onDrop={onDrop}
          className="flex-1 relative overflow-auto"
          style={{
            backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          }}
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
          ) : (
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "0 0", width: "200%", height: "200%" }}>
              {notes.map(n => <Sticky key={n.id} note={n} onMove={(x, y) => updateNote(n.id, { x, y })} onAction={() => fireAction(n)} onDelete={() => deleteNote(n.id)} onText={t => updateNote(n.id, { text: t })} />)}
              {notes.length === 0 && (
                <div className="absolute inset-0 p-8 overflow-auto">
                  <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-6">
                      <p className="text-sm font-semibold text-slate-700">Start with an operational template</p>
                      <p className="text-xs text-slate-500 mt-1">Drag onto canvas or click to add — these become live nodes you can edit</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {[
                        { label: "Proposal Generator", color: "yellow" as Color, hint: "Tailored client pitch" },
                        { label: "Client Intake", color: "yellow" as Color, hint: "Discovery questions" },
                        { label: "Scope Agreement", color: "blue" as Color, hint: "Deliverables + timelines" },
                        { label: "Invoice System", color: "green" as Color, hint: "Get paid faster" },
                        { label: "CRM Pipeline", color: "blue" as Color, hint: "Track every lead" },
                        { label: "Content Workflow", color: "yellow" as Color, hint: "Plan → publish loop" },
                        { label: "Automation Flow", color: "red" as Color, hint: "n8n / Zapier ops" },
                        { label: "Portfolio Board", color: "green" as Color, hint: "Showcase wins" },
                      ].map(t => {
                        const M = COLOR_META[t.color];
                        return (
                          <button
                            key={t.label}
                            onClick={() => addNote(t.color, t.label, 200 + Math.random() * 200, 200 + Math.random() * 150)}
                            className={`text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all group`}
                          >
                            <div className={`w-7 h-7 rounded-lg ${M.bg} ring-1 ${M.ring} flex items-center justify-center mb-2`}>
                              <M.icon className="w-3.5 h-3.5 text-slate-700" />
                            </div>
                            <p className="text-xs font-semibold text-slate-900">{t.label}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{t.hint}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!actionNote && (!!aiResult || aiBusy)} onOpenChange={o => { if (!o) { setActionNote(null); setAiResult(null); }}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionNote?.color === "red" ? "🔥 Closing pitch" : "💡 Research insight"}</DialogTitle>
            <DialogDescription>For: {actionNote?.text}</DialogDescription>
          </DialogHeader>
          {aiBusy ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
          ) : (
            <div className="space-y-3">
              <pre className="whitespace-pre-wrap text-sm bg-slate-50 border rounded p-3 max-h-80 overflow-auto">{aiResult}</pre>
              <Button onClick={() => { navigator.clipboard.writeText(aiResult || ""); toast.success("Copied"); }} variant="outline" size="sm">
                <Copy className="w-3.5 h-3.5 mr-1" />Copy
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Sticky({ note, onMove, onAction, onDelete, onText }: {
  note: CanvasNote;
  onMove: (x: number, y: number) => void;
  onAction: () => void;
  onDelete: () => void;
  onText: (t: string) => void;
}) {
  const M = COLOR_META[note.color];
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x: note.x, y: note.y });
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => { setPos({ x: note.x, y: note.y }); }, [note.x, note.y]);

  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("button, textarea")) return;
    setDragging(true);
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
    const onUp = () => { setDragging(false); onMoveCommit(); };
    const onMoveCommit = () => onMove2();
    function onMove2() {}
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);
  useEffect(() => {
    if (!dragging) onMove(pos.x, pos.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  return (
    <div
      onMouseDown={onMouseDown}
      style={{ left: pos.x, top: pos.y, position: "absolute" }}
      className={`w-44 ${M.bg} rounded-md shadow-md hover:shadow-xl transition-shadow ring-1 ${M.ring} ${dragging ? "cursor-grabbing" : "cursor-grab"} select-none`}
    >
      <div className="flex items-center justify-between px-2 py-1 border-b border-black/10">
        <M.icon className="w-3.5 h-3.5 text-slate-700" />
        <div className="flex gap-1">
          <button onClick={onAction} className="text-[10px] px-1.5 py-0.5 rounded bg-white/70 hover:bg-white text-slate-700"><Wand2 className="w-3 h-3 inline" /></button>
          <button onClick={onDelete} className="text-[10px] px-1 rounded text-rose-600 hover:bg-white/70"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
      <textarea
        value={note.text}
        onChange={e => onText(e.target.value)}
        rows={3}
        className="w-full bg-transparent resize-none text-sm p-2 text-slate-900 focus:outline-none placeholder:text-slate-500"
      />
    </div>
  );
}

const CANVAS_SQL = `-- Run once in hustl-production Supabase SQL editor
create table if not exists public.canvas_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  text text not null default '',
  color text not null default 'yellow',
  x double precision not null default 200,
  y double precision not null default 200,
  client_id uuid,
  last_action_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.canvas_notes enable row level security;
create policy "anyone read" on public.canvas_notes for select using (true);
create policy "anyone insert" on public.canvas_notes for insert with check (true);
create policy "anyone update" on public.canvas_notes for update using (true);
create policy "anyone delete" on public.canvas_notes for delete using (true);
create index on public.canvas_notes(owner_id);

-- Lightweight mirror of primary-DB profile (id/email/tier) so future workspace-only
-- features can join locally without cross-DB calls.
create table if not exists public.workspace_profiles (
  user_id uuid primary key,
  email text,
  tier text default 'free',
  last_synced_at timestamptz default now()
);
alter table public.workspace_profiles enable row level security;
create policy "anyone upsert" on public.workspace_profiles for insert with check (true);
create policy "anyone update" on public.workspace_profiles for update using (true);
create policy "anyone read" on public.workspace_profiles for select using (true);`;