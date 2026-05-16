import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight, Brain, CheckCircle2 } from "lucide-react";
import { useAutomations, useAutomationRuns } from "@/lib/workspace/automations";
import { TEMPLATES, getTemplate } from "@/lib/workspace/automationTemplates";
import { wp } from "@/lib/workspace/paths";

/**
 * Project-scoped automations panel.
 * Shows the operator: which assistants are already active for this project,
 * which ones we'd recommend next, and the last few runs that touched it.
 * Stays calm — no nodes, no graphs, no config.
 */
export function ProjectAutomations({ workspaceId }: { workspaceId: string }) {
  const { enabledSet } = useAutomations();
  const { runs } = useAutomationRuns(20);

  const projectRuns = useMemo(
    () => runs.filter((r: any) => !r.project_id || r.project_id === workspaceId).slice(0, 4),
    [runs, workspaceId]
  );

  const active   = TEMPLATES.filter(t => enabledSet.has(t.id)).slice(0, 4);
  const suggested = TEMPLATES
    .filter(t => !enabledSet.has(t.id) && !t.comingSoon && t.recommended)
    .slice(0, 3);

  return (
    <Card className="p-5 border-border/60">
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Operational assistants</h3>
        </div>
        <Link
          to={wp("automations")}
          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          Manage <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Active */}
      <div className="space-y-2.5">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Active</div>
        {active.length === 0 ? (
          <p className="text-xs text-muted-foreground">No assistants running yet for your operations.</p>
        ) : (
          <ul className="space-y-1.5">
            {active.map((t) => {
              const Icon = t.icon;
              return (
                <li key={t.id} className="flex items-center gap-2.5 text-xs">
                  <Icon className="h-3.5 w-3.5 text-foreground/70 shrink-0" />
                  <span className="font-medium text-foreground/90 truncate">{t.title}</span>
                  {t.ai && <Badge variant="outline" className="text-[9px] gap-1 border-primary/30 text-primary"><Brain className="h-2 w-2" /> AI</Badge>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Suggested */}
      {suggested.length > 0 && (
        <div className="mt-5 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Suggested for this project</div>
          <ul className="space-y-1.5">
            {suggested.map((t) => {
              const Icon = t.icon;
              return (
                <li key={t.id} className="flex items-start gap-2.5 text-xs">
                  <Icon className="h-3.5 w-3.5 text-foreground/60 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-foreground/90">{t.title}</div>
                    <div className="text-muted-foreground text-[11px] mt-0.5">{t.outcome}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Recent runs */}
      {projectRuns.length > 0 && (
        <div className="mt-5 space-y-2.5">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Recent activity</div>
          <ul className="space-y-1.5">
            {projectRuns.map((r: any) => {
              const t = getTemplate(r.template_id);
              return (
                <li key={r.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span className="truncate text-foreground/80">{t?.title || r.template_id}</span>
                  </span>
                  <span className="text-muted-foreground shrink-0">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}