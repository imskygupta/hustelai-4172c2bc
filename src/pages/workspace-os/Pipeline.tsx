import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PIPELINE_STAGES } from "@/lib/workspace-os/types";
import { Plus, GripVertical, Calendar, IndianRupee, ArrowUpRight } from "lucide-react";
import { wp, wpProject } from "@/lib/workspace/paths";
import { formatDistanceToNowStrict } from "date-fns";

// Notion-style calm board: roomy cards, soft column tints, smooth motion.
// Each stage gets a unique but quiet accent so the eye scans columns fast.
const STAGE_TINT: Record<string, { dot: string; tint: string; ring: string }> = {
  inquiry:     { dot: "bg-slate-400",   tint: "bg-slate-50/60",   ring: "ring-slate-200/60" },
  planning:    { dot: "bg-blue-400",    tint: "bg-blue-50/50",    ring: "ring-blue-200/50" },
  design:      { dot: "bg-violet-400",  tint: "bg-violet-50/50",  ring: "ring-violet-200/50" },
  development: { dot: "bg-amber-400",   tint: "bg-amber-50/50",   ring: "ring-amber-200/50" },
  review:      { dot: "bg-cyan-400",    tint: "bg-cyan-50/50",    ring: "ring-cyan-200/50" },
  delivery:    { dot: "bg-emerald-400", tint: "bg-emerald-50/50", ring: "ring-emerald-200/50" },
  completed:   { dot: "bg-green-500",   tint: "bg-green-50/50",   ring: "ring-green-200/50" },
};

const ago = (d?: string | null) => { if (!d) return ""; try { return formatDistanceToNowStrict(new Date(d), { addSuffix: true }); } catch { return ""; } };

export default function Pipeline() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("workspaces")
        .select("id,client_name,status,pipeline_stage,pricing,updated_at,deadlines")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false });
      setItems(data || []);
      setLoading(false);
    })();
  }, [user]);

  const move = async (id: string, stage: string) => {
    setItems(arr => arr.map(w => w.id === id ? { ...w, pipeline_stage: stage } : w));
    await (supabase as any).from("workspaces").update({ pipeline_stage: stage }).eq("id", id);
  };

  const totals = useMemo(() => {
    const totalValue = items.reduce((s, w) => s + (Number(w.pricing?.amount) || 0), 0);
    return { count: items.length, totalValue };
  }, [items]);

  return (
    <div className="space-y-7">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-1.5">Pipeline</p>
          <h2 className="text-[28px] font-semibold tracking-tight leading-tight">Project pipeline</h2>
          <p className="text-sm text-muted-foreground/85 mt-1.5 max-w-xl">
            Every project, every stage, on one calm board. Drag a card to move it forward.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-4 px-4 py-2 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Active</p>
              <p className="text-base font-semibold tabular-nums">{totals.count}</p>
            </div>
            <div className="h-8 w-px bg-border/60" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Pipeline value</p>
              <p className="text-base font-semibold tabular-nums">₹{totals.totalValue.toLocaleString("en-IN")}</p>
            </div>
          </div>
          <Link to={wp("projects/new")} className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition">
            <Plus className="h-4 w-4" /> New project
          </Link>
        </div>
      </header>

      <div className="overflow-x-auto pb-6 -mx-4 lg:-mx-6 px-4 lg:px-6">
        <div className="flex gap-4 min-w-max">
          {PIPELINE_STAGES.map((stage, si) => {
            const tint = STAGE_TINT[stage.id] || STAGE_TINT.inquiry;
            const list = items.filter(w => (w.pipeline_stage || "inquiry") === stage.id);
            const isOver = dragOver === stage.id;
            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: si * 0.04 }}
                onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => {
                  setDragOver(null);
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) move(id, stage.id);
                }}
                className={`w-[300px] shrink-0 rounded-2xl border transition-all ${
                  isOver
                    ? `bg-foreground/[0.04] border-foreground/30 ring-2 ${tint.ring}`
                    : `${tint.tint} border-border/40`
                }`}
              >
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2 w-2 rounded-full ${tint.dot}`} />
                    <span className="text-[13px] font-medium tracking-tight truncate">{stage.label}</span>
                    <span className="text-[11px] tabular-nums text-muted-foreground/70 bg-foreground/[0.04] rounded-full px-1.5 py-0.5">{list.length}</span>
                  </div>
                </div>

                <div className="px-2 pb-3 space-y-2 min-h-[120px]">
                  {loading ? (
                    <>{[0,1].map(i => <div key={i} className="ws-shimmer h-20 rounded-xl mx-2" />)}</>
                  ) : list.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground/55 text-center py-8 px-3 leading-relaxed">
                      Drop projects here or<br />
                      <Link to={wp("projects/new")} className="text-foreground/80 hover:underline">create one →</Link>
                    </div>
                  ) : list.map(w => (
                    <motion.div
                      key={w.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      draggable
                      onDragStart={e => e.dataTransfer.setData("text/plain", w.id)}
                      className="group cursor-grab active:cursor-grabbing"
                    >
                      <Link
                        to={wpProject(w.id)}
                        className="block rounded-xl border border-border/50 bg-white/90 backdrop-blur-sm p-3 hover:border-foreground/20 hover:shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08)] transition-all"
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[13.5px] font-medium leading-snug truncate">{w.client_name}</p>
                              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground/75">
                              {w.pricing?.amount ? (
                                <span className="inline-flex items-center gap-0.5 tabular-nums">
                                  <IndianRupee className="h-3 w-3" />{Number(w.pricing.amount).toLocaleString("en-IN")}
                                </span>
                              ) : null}
                              {w.pricing?.amount && w.updated_at && <span className="opacity-40">·</span>}
                              {w.updated_at && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />{ago(w.updated_at)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}