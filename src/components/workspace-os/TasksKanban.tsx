import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, GripVertical, Trash2 } from "lucide-react";
import { PIPELINE_STAGES, type WorkspaceTask } from "@/lib/workspace-os/types";
import { toast } from "sonner";
import { logActivity } from "@/lib/workspace-os/activity";
import { useIsMobile } from "@/hooks/use-mobile";

export default function TasksKanban({ workspaceId, ownerId }: { workspaceId: string; ownerId: string }) {
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const isMobile = useIsMobile();

  const load = async () => {
    const { data } = await (supabase as any)
      .from("workspace_tasks").select("*").eq("workspace_id", workspaceId).order("position");
    setTasks(data || []);
  };
  useEffect(() => { load(); }, [workspaceId]);

  const addTask = async (stage: string) => {
    if (!newTitle.trim()) return;
    const { error } = await (supabase as any).from("workspace_tasks").insert({
      workspace_id: workspaceId, owner_id: ownerId, title: newTitle, stage, position: tasks.length,
    });
    if (error) return toast.error(error.message);
    setNewTitle(""); setAdding(null); load();
    logActivity({ workspaceId, ownerId, event_type: "task_created", message: `Task added: ${newTitle}` });
  };

  const moveTask = async (id: string, stage: string) => {
    await (supabase as any).from("workspace_tasks").update({ stage }).eq("id", id);
    setTasks(t => t.map(x => x.id === id ? { ...x, stage } : x));
    logActivity({ workspaceId, ownerId, event_type: "task_moved", message: `Task moved to ${stage}` });
  };

  const remove = async (id: string) => {
    await (supabase as any).from("workspace_tasks").delete().eq("id", id);
    setTasks(t => t.filter(x => x.id !== id));
  };

  const onDragStart = (e: React.DragEvent, id: string) => e.dataTransfer.setData("text/plain", id);
  const onDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) moveTask(id, stage);
  };

  // Mobile: a fixed-width horizontal kanban is unusable below 768px.
  // Render a stacked list with a stage selector per task instead. No
  // drag-and-drop on mobile — tap-to-move is enough (Sprint 1 P1 #4).
  if (isMobile) {
    return (
      <div className="space-y-4">
        {PIPELINE_STAGES.map(stage => {
          const list = tasks.filter(t => t.stage === stage.id);
          return (
            <div key={stage.id} className="rounded-2xl border border-border bg-card/50 p-3">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${stage.color}`}>{stage.label}</span>
                  <span className="text-xs text-muted-foreground">{list.length}</span>
                </div>
                <button onClick={() => setAdding(stage.id)} className="text-muted-foreground hover:text-foreground">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                {list.length === 0 && adding !== stage.id && (
                  <p className="text-[12px] text-muted-foreground/70 px-1 py-2">No tasks in this stage.</p>
                )}
                {list.map(t => (
                  <div key={t.id} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{t.title}</p>
                        {t.due_date && <p className="text-[10px] text-muted-foreground mt-1">Due {t.due_date}</p>}
                      </div>
                      <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <select
                      value={t.stage}
                      onChange={e => moveTask(t.id, e.target.value)}
                      className="mt-2 w-full text-xs rounded-md border border-border bg-background px-2 py-1.5"
                    >
                      {PIPELINE_STAGES.map(s => (
                        <option key={s.id} value={s.id}>Move to {s.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
                {adding === stage.id && (
                  <div className="rounded-lg border border-primary/40 bg-background p-2 space-y-2">
                    <Input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title..." onKeyDown={e => e.key === "Enter" && addTask(stage.id)} />
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => addTask(stage.id)}>Add</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setAdding(null); setNewTitle(""); }}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max">
        {PIPELINE_STAGES.map(stage => {
          const list = tasks.filter(t => t.stage === stage.id);
          return (
            <div
              key={stage.id}
              onDragOver={e => e.preventDefault()}
              onDrop={e => onDrop(e, stage.id)}
              className="w-72 shrink-0 rounded-2xl border border-border bg-card/50 p-3"
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${stage.color}`}>{stage.label}</span>
                  <span className="text-xs text-muted-foreground">{list.length}</span>
                </div>
                <button onClick={() => setAdding(stage.id)} className="text-muted-foreground hover:text-foreground">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2 min-h-[40px]">
                {list.map(t => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={e => onDragStart(e, t.id)}
                    className="group rounded-lg border border-border bg-background p-3 cursor-grab active:cursor-grabbing hover:border-primary/40"
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-3 w-3 text-muted-foreground/50 mt-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{t.title}</p>
                        {t.due_date && <p className="text-[10px] text-muted-foreground mt-1">Due {t.due_date}</p>}
                      </div>
                      <button onClick={() => remove(t.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {adding === stage.id && (
                  <div className="rounded-lg border border-primary/40 bg-background p-2 space-y-2">
                    <Input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title..." onKeyDown={e => e.key === "Enter" && addTask(stage.id)} />
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => addTask(stage.id)}>Add</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setAdding(null); setNewTitle(""); }}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}