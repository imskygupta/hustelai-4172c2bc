import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Receipt, Send, Search, Map as MapIcon, Brain, Workflow, Calendar, Sparkles } from "lucide-react";
import { useRecentOutputs, type WorkspaceOutput } from "@/lib/workspace/outputs";
import { wp } from "@/lib/workspace/paths";
import { formatDistanceToNowStrict } from "date-fns";

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
  const { items, loading } = useRecentOutputs({ scopeToProject: true, limit: 8 });
  const grouped = useMemo(() => items, [items]);

  if (loading || grouped.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Project memory</h3>
        <span className="text-[10px] text-muted-foreground/60">{grouped.length} linked output{grouped.length === 1 ? "" : "s"}</span>
      </div>
      <ul className="space-y-2">
        {grouped.map((o, i) => {
          const Icon = iconFor(o.tool || "");
          return (
            <motion.li
              key={o.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
            >
              <Link
                to={hrefFor(o, workspaceId)}
                className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 -mx-2 hover:bg-muted/40 transition-colors"
              >
                <span className="inline-flex h-7 w-7 shrink-0 rounded-md bg-primary/8 items-center justify-center mt-0.5">
                  <Icon className="h-3.5 w-3.5 text-primary/80" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-tight truncate group-hover:text-primary transition-colors">{o.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    <span className="capitalize">{(o.tool || "output").replace(/[-_]/g, " ")}</span>
                    <span className="text-muted-foreground/40"> · </span>
                    {ago(o.created_at)}
                  </p>
                </div>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

function ago(d: string) {
  try { return formatDistanceToNowStrict(new Date(d), { addSuffix: true }); } catch { return ""; }
}
