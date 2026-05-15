/**
 * WorkspaceFrame — thin persistent shell around migrated execution tools.
 *
 * Goal: every workspace tool feels like part of ONE operating system, not a
 * standalone page. We surface the *active AI provider* (BYOK status) and a
 * link back to the cockpit. Project/client switchers live here later.
 *
 * Render rules:
 *   - workspace.hustlaiapp.in (or dual host preview) → render frame
 *   - marketing host → render children unwrapped (the redirect layer will
 *     hop the user to workspace.* anyway, so a frame would just flicker)
 *
 * Keep this LIGHT. Do not recreate dashboard complexity here. See
 * mem://features/workspace-pivot.
 */
import { Link } from "react-router-dom";
import { Sparkles, KeyRound, AlertCircle, ArrowUpRight, Briefcase } from "lucide-react";
import { isMarketingHost } from "@/lib/host";
import { useWorkspace, PROVIDER_LABELS } from "@/lib/workspace/context";
import { wp, wpProject } from "@/lib/workspace/paths";

export function WorkspaceFrame({ children }: { children: React.ReactNode }) {
  // On the strict marketing host the SurfaceHostRedirect will hop us away.
  // Don't render the frame there — avoids a flash of workspace chrome on
  // hustlaiapp.in/ai-tools right before the redirect fires.
  if (typeof window !== "undefined" && isMarketingHost()) {
    return <>{children}</>;
  }
  return (
    <div className="min-h-[calc(100vh-3rem)] flex flex-col">
      <WorkspaceTopBar />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function WorkspaceTopBar() {
  const { activeProvider, providerLoading, activeProjectId } = useWorkspace();
  const label = activeProvider ? (PROVIDER_LABELS[activeProvider.provider] || activeProvider.provider) : null;
  const healthy = activeProvider?.last_test_ok !== false;

  return (
    <div className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 h-12 flex items-center gap-3">
        <Link to={wp("")} className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground">
          <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </span>
          <span className="hidden sm:inline">Workspace</span>
        </Link>

        {activeProjectId && (
          <>
            <span className="text-muted-foreground/40">/</span>
            <Link
              to={wpProject(activeProjectId)}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span className="truncate max-w-[160px]">Active project</span>
            </Link>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <ProviderBadge label={label} healthy={healthy} loading={providerLoading} />
          <Link
            to={wp("")}
            className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground rounded-full border border-border/60 px-2.5 py-1"
          >
            Cockpit <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProviderBadge({ label, healthy, loading }: { label: string | null; healthy: boolean; loading: boolean }) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
        Loading fuel…
      </span>
    );
  }
  if (!label) {
    return (
      <Link
        to={wp("providers")}
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
      >
        <KeyRound className="h-3 w-3" />
        Connect AI fuel
      </Link>
    );
  }
  return (
    <Link
      to={wp("providers")}
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
      title="Active AI provider — click to change"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${healthy ? "bg-emerald-500" : "bg-amber-500"}`} />
      {label}
      {!healthy && <AlertCircle className="h-3 w-3" />}
    </Link>
  );
}