import { useEffect, useState } from "react";
import { workspaceDb, type WorkNote } from "@/integrations/workspace/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, StickyNote } from "lucide-react";
import { toast } from "sonner";

const COLORS: Record<string, string> = {
  yellow: "bg-amber-100 border-amber-200",
  pink: "bg-rose-100 border-rose-200",
  blue: "bg-sky-100 border-sky-200",
  green: "bg-emerald-100 border-emerald-200",
};

export function NotesTab({ userId }: { userId?: string }) {
  const [items, setItems] = useState<WorkNote[]>([]);
  const [content, setContent] = useState("");
  const [color, setColor] = useState("yellow");

  async function load() {
    if (!userId) return;
    const { data } = await workspaceDb.from("work_notes").select("*").eq("owner_id", userId).order("created_at", { ascending: false });
    setItems((data || []) as WorkNote[]);
  }
  useEffect(() => { load(); }, [userId]);

  async function add() {
    if (!userId || !content.trim()) return;
    const { error } = await workspaceDb.from("work_notes").insert({ owner_id: userId, content, color });
    if (error) return toast.error(error.message);
    setContent(""); load();
  }
  async function remove(id: string) { await workspaceDb.from("work_notes").delete().eq("id", id); load(); }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2"><StickyNote className="w-4 h-4 text-amber-600" /><span className="font-semibold">Quick note</span></div>
        <Textarea placeholder="Brain-dump something…" value={content} onChange={e => setContent(e.target.value)} />
        <div className="flex items-center gap-2 mt-2">
          {Object.keys(COLORS).map(c => (
            <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full border-2 ${COLORS[c]} ${color === c ? "ring-2 ring-slate-900" : ""}`} />
          ))}
          <Button size="sm" className="ml-auto" onClick={add}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </div>
      </Card>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(n => (
          <div key={n.id} className={`${COLORS[n.color] || COLORS.yellow} border rounded-lg p-3 group relative`}>
            <div className="text-sm whitespace-pre-wrap text-slate-800">{n.content}</div>
            <div className="text-[10px] text-slate-500 mt-2">{new Date(n.created_at).toLocaleDateString("en-IN")}</div>
            <Button size="icon" variant="ghost" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100" onClick={() => remove(n.id)}>
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}