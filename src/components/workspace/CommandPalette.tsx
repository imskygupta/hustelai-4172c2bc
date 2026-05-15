/**
 * WorkspaceCommandPalette — Raycast/Linear-style ⌘K quick-switcher.
 *
 * Surfaces: workspaces, recent outputs, pinned assets, and a small set of
 * navigation actions. Intentionally tiny — no fuzzy search lib, just
 * substring filter; no remote search; debounced render is unnecessary.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Briefcase, Sparkles, Star, ArrowRight, KeyRound, Layers, Map, FileText, Cpu,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace/context";

type Item = {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Sparkles;
  group: "Workspaces" | "Outputs" | "Assets" | "Go to";
  run: () => void;
};

const NAV_ACTIONS = (navigate: (p: string) => void): Item[] => [
  { id: "nav-overview",  label: "Workspace Overview",   hint: "/workspaces",         icon: Briefcase, group: "Go to", run: () => navigate("/workspaces") },
  { id: "nav-canvas",    label: "Hustle Canvas",        hint: "/canvas",             icon: Layers,    group: "Go to", run: () => navigate("/canvas") },
  { id: "nav-blueprint", label: "Blueprint Generator",  hint: "/hustle-blueprint",   icon: Map,       group: "Go to", run: () => navigate("/hustle-blueprint") },
  { id: "nav-knowledge", label: "Knowledge Hub",        hint: "/knowledge-hub",      icon: FileText,  group: "Go to", run: () => navigate("/knowledge-hub") },
  { id: "nav-providers", label: "AI Infrastructure",    hint: "/workspaces/ai-settings", icon: Cpu,   group: "Go to", run: () => navigate("/workspaces/ai-settings") },
];

export function WorkspaceCommandPalette() {
  const { user } = useAuth();
  const { setActiveProject } = useWorkspace();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [outputs, setOutputs] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);

  // Hotkey: ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lazy load when opened
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [ws, recent, pinned] = await Promise.all([
        (supabase as any).from("workspaces").select("id,client_name,status").eq("owner_id", user.id).order("updated_at", { ascending: false }).limit(15),
        (supabase as any).from("workspace_outputs").select("id,tool,title,project_id").eq("user_id", user.id).eq("is_asset", false).order("created_at", { ascending: false }).limit(15),
        (supabase as any).from("workspace_outputs").select("id,tool,title,asset_kind,project_id").eq("user_id", user.id).eq("is_asset", true).order("created_at", { ascending: false }).limit(15),
      ]);
      setWorkspaces(ws.data || []);
      setOutputs(recent.data || []);
      setAssets(pinned.data || []);
    })();
  }, [open, user]);

  const close = useCallback(() => { setOpen(false); setQ(""); }, []);

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    for (const w of workspaces) {
      out.push({
        id: `w-${w.id}`,
        label: w.client_name,
        hint: `Workspace · ${w.status}`,
        icon: Briefcase,
        group: "Workspaces",
        run: () => { setActiveProject(w.id); navigate(`/workspaces/${w.id}`); close(); },
      });
    }
    for (const o of outputs) {
      out.push({
        id: `o-${o.id}`,
        label: o.title,
        hint: o.tool,
        icon: Sparkles,
        group: "Outputs",
        run: () => { if (o.project_id) setActiveProject(o.project_id); navigate("/canvas"); close(); },
      });
    }
    for (const a of assets) {
      out.push({
        id: `a-${a.id}`,
        label: a.title,
        hint: a.asset_kind || "asset",
        icon: Star,
        group: "Assets",
        run: () => { if (a.project_id) setActiveProject(a.project_id); navigate("/canvas"); close(); },
      });
    }
    out.push(...NAV_ACTIONS(navigate).map(it => ({ ...it, run: () => { it.run(); close(); } })));
    if (!q.trim()) return out.slice(0, 30);
    const needle = q.toLowerCase();
    return out.filter(i => i.label.toLowerCase().includes(needle) || (i.hint || "").toLowerCase().includes(needle)).slice(0, 30);
  }, [workspaces, outputs, assets, q, navigate, setActiveProject, close]);

  // Group for render
  const grouped = useMemo(() => {
    const g: Record<string, Item[]> = {};
    for (const it of items) (g[it.group] ||= []).push(it);
    return g;
  }, [items]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-xl rounded-2xl border border-border/70 bg-background shadow-2xl shadow-black/30 overflow-hidden ws-handoff-enter">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search workspaces, outputs, assets…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex text-[10px] uppercase tracking-wider text-muted-foreground/70 border border-border/60 rounded px-1.5 py-0.5">esc</kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No matches.</div>
          ) : (
            Object.entries(grouped).map(([group, list]) => (
              <div key={group} className="mb-1">
                <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">{group}</div>
                {list.map(it => (
                  <button
                    key={it.id}
                    onClick={it.run}
                    className="w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-muted/60 group"
                  >
                    <div className="h-7 w-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                      <it.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{it.label}</p>
                      {it.hint && <p className="text-[11px] text-muted-foreground truncate">{it.hint}</p>}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition shrink-0" />
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border/50 px-4 py-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground/60">
          <span>Workspace quick switch</span>
          <span className="inline-flex items-center gap-1">
            <kbd className="border border-border/60 rounded px-1 py-px">⌘</kbd>
            <kbd className="border border-border/60 rounded px-1 py-px">K</kbd>
            to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
