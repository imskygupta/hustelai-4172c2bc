import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Receipt, Send, Search, Map as MapIcon, Brain, Workflow, Calendar, Sparkles } from "lucide-react";
import { useRecentOutputs, type WorkspaceOutput } from "@/lib/workspace/outputs";
import { wp } from "@/lib/workspace/paths";
import { formatDistanceToNowStrict, format, isToday, isYesterday } from "date-fns";

/**
 * LinkedTimeline — lightweight chronological feed of AI outputs in the
 * current project. Not a Slack clone; just enough to make the project feel
 * like operational memory ("you've already produced X, Y, Z here").
 *
 * Each row links back to the tool that created it (best-effort, via the
 * `tool` slug) so the operator can keep iterating without hunting.
 */

function iconFor(tool: string) {
  const t = tool.toLowerCase();
  if (t.includes("invoice")) return Receipt;
  if (t.includes("proposal")) return FileText;
  if (t.includes("outreach") || t.includes("email")) return Send;
  if (t.includes("research") || t.includes("icp")) return Search;
  if (t.includes("roadmap") || t.includes("blueprint") || t.includes("scope")) return MapIcon;
  if (t.includes("calendar") || t.includes("publish")) return Calendar;
  if (t.includes("strategy") || t.includes("pillars")) return Brain;
  if (t.includes("automation") || t.includes("workflow")) return Workflow;
  return Sparkles;
}

function hrefFor(o: WorkspaceOutput, workspaceId: string) {
  const t = (o.tool || "").toLowerCase();
  if (t.includes("invoice"))   return `${wp("tools")}?workspace=${workspaceId}&intent=invoice`;
  if (t.includes("proposal"))  return `${wp("tools")}?workspace=${workspaceId}&intent=proposal`;
  if (t.includes("blueprint")) return `${wp("blueprint")}?workspace=${workspaceId}`;
  if (t.includes("roadmap"))   return `${wp("")}/${workspaceId}?tab=roadmap`;
  return `${wp("canvas")}?workspace=${workspaceId}`;
}

export function LinkedTimeline({ workspaceId }: { workspaceId: string }) {
  const { items, loading } = useRecentOutputs({ scopeToProject: true, limit: 12 });

  // Group by day so the project feels like operational continuity, not a feed.
  const days = useMemo(() => {
    const buckets = new Map<string, { label: string; items: WorkspaceOutput[] }>();
    for (const o of items) {
      const d = new Date(o.created_at);
      const key = format(d, "yyyy-MM-dd");
      const label = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "EEE, MMM d");
      if (!buckets.has(key)) buckets.set(key, { label, items: [] });
      buckets.get(key)!.items.push(o);
    }
    return Array.from(buckets.values());
  }, [items]);

  if (loading || items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border/60 bg-gradient-to-b from-card/60 to-card/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/70 shadow-[0_0_8px_hsl(160_84%_45%/0.6)]" />
          Project continuity
        </h3>
        <span className="text-[10px] text-muted-foreground/60">{items.length} linked deliverable{items.length === 1 ? "" : "s"}</span>
      </div>
      <div className="relative">
        {/* Continuity rail — emerald glow connects the day's work */}
        <span aria-hidden className="absolute left-[14px] top-2 bottom-2 w-px bg-gradient-to-b from-emerald-500/40 via-border to-transparent" />
        <div className="space-y-4">
          {days.map((day) => (
            <div key={day.label}>
              <p className="ml-9 mb-1.5 text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground/70 font-semibold">{day.label}</p>
              <ul className="space-y-1">
                {day.items.map((o, i) => {
                  const Icon = iconFor(o.tool || "");
                  return (
                    <motion.li
                      key={o.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.025, duration: 0.22 }}
                      className="relative"
                    >
                      <Link
                        to={hrefFor(o, workspaceId)}
                        className="group flex items-start gap-2.5 rounded-lg pl-1 pr-2 py-1.5 hover:bg-muted/40 transition-colors"
                      >
                        <span className="relative z-10 inline-flex h-7 w-7 shrink-0 rounded-md bg-background border border-emerald-500/20 items-center justify-center mt-0.5 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_0_3px_hsl(160_84%_45%/0.08)] transition-all">
                          <Icon className="h-3.5 w-3.5 text-emerald-600/80" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] leading-tight truncate group-hover:text-foreground text-foreground/90 transition-colors">{o.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            <span className="capitalize">{(o.tool || "output").replace(/^intent:/, "").replace(/[-_]/g, " ")}</span>
                            <span className="text-muted-foreground/40"> · </span>
                            {ago(o.created_at)}
                            <span className="text-muted-foreground/40"> · </span>
                            <span className="text-emerald-600/70">synced</span>
                          </p>
                        </div>
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ago(d: string) {
  try { return formatDistanceToNowStrict(new Date(d), { addSuffix: true }); } catch { return ""; }
}
