import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PIPELINE_STAGES } from "@/lib/workspace-os/types";
import { Briefcase } from "lucide-react";

export default function Pipeline() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any).from("workspaces").select("*").eq("owner_id", user.id);
      setItems(data || []);
    })();
  }, [user]);

  const move = async (id: string, stage: string) => {
    await (supabase as any).from("workspaces").update({ pipeline_stage: stage }).eq("id", id);
    setItems(arr => arr.map(w => w.id === id ? { ...w, pipeline_stage: stage } : w));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Project pipeline</h2>
        <p className="text-sm text-muted-foreground mt-1">Drag clients across stages. Each card is a real workspace.</p>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {PIPELINE_STAGES.map(stage => {
            const list = items.filter(w => (w.pipeline_stage || "inquiry") === stage.id);
            return (
              <div
                key={stage.id}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { const id = e.dataTransfer.getData("text/plain"); if (id) move(id, stage.id); }}
                className="w-72 shrink-0 rounded-2xl border border-border bg-card/40 p-3"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${stage.color}`}>{stage.label}</span>
                  <span className="text-xs text-muted-foreground">{list.length}</span>
                </div>
                <div className="space-y-2 min-h-[60px]">
                  {list.map(w => (
                    <motion.div
                      key={w.id}
                      draggable
                      onDragStart={e => e.dataTransfer.setData("text/plain", w.id)}
                      layout
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <Link to={`/workspaces/${w.id}`} className="block rounded-lg border border-border bg-background p-3 hover:border-primary/40">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Briefcase className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{w.client_name}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{w.status}</p>
                          </div>
                          {w.pricing?.amount && <span className="text-[10px] font-medium text-primary">₹{w.pricing.amount}</span>}
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}