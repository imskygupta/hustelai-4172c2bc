import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Loader2, KeyRound, FolderOpen, Activity, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { WORKSPACE_ORIGIN, isDualHost } from "@/lib/host";
import { SEO } from "@/components/SEO";

/**
 * Workspace Gateway — the ONLY thing that lives at hustlaiapp.in/workspaces.
 *
 * This is intentionally NOT a mini cockpit. The execution surface lives only
 * on workspace.hustlaiapp.in. This page is a calm, premium handoff:
 *  - confirms identity
 *  - shows a snapshot (active workspaces, providers, recent outputs)
 *  - provides one explicit "Enter Workspace" action
 *
 * The handoff is intentional, with a brief loading state, then a hard hop
 * into the workspace subdomain. Auth continuity is handled by the existing
 * .hustlaiapp.in bridge cookie (see mem://tech/workspace-subdomain).
 */
export default function WorkspaceGateway() {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<{
    workspaces: number;
    activeProviders: number;
    recentOutputs: number;
    lastActivity: string | null;
  }>({ workspaces: 0, activeProviders: 0, recentOutputs: 0, lastActivity: null });
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [{ count: wsCount }, { count: provCount }, { data: recent }] = await Promise.all([
          (supabase as any).from("workspaces").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
          (supabase as any).from("workspace_ai_keys").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
          (supabase as any).from("workspace_outputs").select("created_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(10),
        ]);
        setSnapshot({
          workspaces: wsCount || 0,
          activeProviders: provCount || 0,
          recentOutputs: recent?.length || 0,
          lastActivity: recent?.[0]?.created_at || null,
        });
      } catch {
        // Snapshot is best-effort; gateway must always render.
      }
    })();
  }, [user]);

  const launch = () => {
    setLaunching(true);
    // Brief intentional delay so the action feels like a transition,
    // not a redirect. Then hard-hop into the workspace surface.
    window.setTimeout(() => {
      if (isDualHost()) {
        // Dev/preview can't cross subdomains — render the cockpit locally.
        window.location.href = "/";
      } else {
        window.location.href = `${WORKSPACE_ORIGIN}/`;
      }
    }, 650);
  };

  const lastActivityLabel = snapshot.lastActivity
    ? new Date(snapshot.lastActivity).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4 py-12">
      <SEO title="Enter Workspace · HustleAI" description="Launch your dedicated HustleAI workspace — the focused execution surface for operators and agencies." path="/workspaces" noindex />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-2xl"
      >
        <div className="rounded-3xl border border-border/60 bg-card/70 backdrop-blur-xl shadow-2xl shadow-primary/5 overflow-hidden">
          {/* Top */}
          <div className="p-8 sm:p-10 border-b border-border/40">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center shadow-lg shadow-primary/30">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">HustleAI</p>
                <p className="text-sm font-medium text-foreground/80">Workspace gateway</p>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
              Ready to enter your workspace?
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl">
              A focused execution environment for operators &amp; agencies. Your providers,
              clients, projects and outputs — all in one calm surface, isolated from the
              marketing app.
            </p>
          </div>

          {/* Snapshot */}
          <div className="px-8 sm:px-10 py-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-border/40 bg-muted/10">
            <Stat icon={FolderOpen} label="Workspaces" value={snapshot.workspaces} />
            <Stat icon={KeyRound} label="Providers" value={snapshot.activeProviders} />
            <Stat icon={Activity} label="Recent outputs" value={snapshot.recentOutputs} />
            <Stat icon={ShieldCheck} label="Last activity" value={lastActivityLabel} small />
          </div>

          {/* CTA */}
          <div className="p-8 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="text-xs text-muted-foreground max-w-xs">
              {user ? (
                <>Signed in as <span className="text-foreground">{user.email}</span>. Session will carry over securely.</>
              ) : (
                <>You'll be asked to sign in before the workspace opens.</>
              )}
            </div>
            <button
              onClick={launch}
              disabled={launching}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-medium shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.99] transition-transform disabled:opacity-80"
            >
              {launching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening workspace…
                </>
              ) : (
                <>
                  Enter Workspace
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Workspace runs on <span className="text-foreground/80">workspace.hustlaiapp.in</span> — isolated from the main app for stability and focus.
        </p>
      </motion.div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, small }: { icon: any; label: string; value: any; small?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={small ? "text-xs font-medium text-foreground/90 truncate" : "text-xl font-semibold text-foreground"}>{value}</div>
    </div>
  );
}