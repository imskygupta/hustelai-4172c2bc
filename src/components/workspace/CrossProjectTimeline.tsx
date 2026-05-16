/**
 * Cross-project operational memory — a calm, alive feed of what's been
 * produced across every project recently. Reads `workspace_outputs` for
 * the operator, joins client names from `workspaces`, and renders a
 * single chronological stream like "Proposal delivered for Acme".
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/lib/workspace/context";
import { wpProject } from "@/lib/workspace/paths";
import { trackProjectVisit } from "@/lib/workspace/operator";
import { formatDistanceToNowStrict } from "date-fns";

type Row = {
  id: string; tool: string; title: string;
  project_id: string | null; created_at: string; is_asset: boolean;
};

function verb(tool: string, isAsset: boolean): string {
  const t = (tool || "").toLowerCase();
  if (isAsset) return "Saved";
  if (t.includes("proposal")) return "Proposal drafted";
  if (t.includes("invoice"))  return "Invoice generated";
  if (t.includes("outreach") || t.includes("cold")) return "Outreach written";
  if (t.includes("sequence")) return "Sequence built";
  if (t.includes("calendar")) return "Calendar planned";
  if (t.includes("strategy") || t.includes("pillars")) return "Strategy generated";
  if (t.includes("roadmap") || t.includes("blueprint")) return "Roadmap mapped";
  if (t.includes("onboard")) return "Onboarding prepared";
  if (t.includes("contract")) return "Contract drafted";
  return "Generated";
}

export function CrossProjectTimeline() {
  const { user } = useAuth();
  const { setActiveProject } = useWorkspace();
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("workspace_outputs")
        .select("id,tool,title,project_id,created_at,is_asset")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12);
      if (cancelled) return;
      const list = (data as Row[]) || [];
      setRows(list);
      const projectIds = Array.from(new Set(list.map(r => r.project_id).filter(Boolean) as string[]));
      if (projectIds.length > 0) {
        const { data: ws } = await (supabase as any)
          .from("workspaces")
          .select("id,client_name")
          .in("id", projectIds);
        if (!cancelled) {
          const map: Record<string, string> = {};
          for (const w of (ws as any[]) || []) map[w.id] = w.client_name;
          setNames(map);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/30 p-5">
        <div className="space-y-2">{[0,1,2,3].map(i => <div key={i} className="ws-shimmer h-8 rounded-md" />)}</div>
      </div>
    );
  }
  if (rows.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border/50 bg-card/30 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Across all projects</p>
          <h3 className="text-sm font-medium tracking-tight">Operational memory</h3>
        </div>
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground/60" />
      </div>
      <ol className="relative space-y-2 pl-3 before:absolute before:left-1 before:top-1 before:bottom-1 before:w-px before:bg-gradient-to-b before:from-emerald-300/40 before:via-border/40 before:to-transparent">
        {rows.map(r => {
          const name = r.project_id ? names[r.project_id] : null;
          const ago = (() => { try { return formatDistanceToNowStrict(new Date(r.created_at), { addSuffix: true }); } catch { return ""; } })();
          const body = (
            <div className="flex items-center gap-2 group">
              <span className="absolute -ml-3 mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500/70" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] truncate">
                  <span className="font-medium">{verb(r.tool, r.is_asset)}</span>
                  {name && <> for <span className="text-foreground/80">{name}</span></>}
                  {!name && r.title && <> · <span className="text-muted-foreground">{r.title}</span></>}
                </p>
                <p className="text-[10.5px] text-muted-foreground/70">{ago}</p>
              </div>
              {r.project_id && (
                <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition shrink-0" />
              )}
            </div>
          );
          return (
            <li key={r.id} className="relative">
              {r.project_id ? (
                <Link
                  to={wpProject(r.project_id)}
                  onMouseEnter={() => { setActiveProject(r.project_id!); trackProjectVisit(r.project_id!); }}
                  className="block py-1"
                >
                  {body}
                </Link>
              ) : <div className="py-1">{body}</div>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}