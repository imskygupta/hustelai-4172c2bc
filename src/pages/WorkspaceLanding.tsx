import { Helmet } from "react-helmet-async";
import { ArrowUpRight, Sparkles, Layers, Rocket, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { MARKETING_ORIGIN } from "@/lib/host";

/**
 * Lightweight standalone shell served on workspace.hustlaiapp.in.
 *
 * Phase 3 architecture: workspace is a separate product surface. This
 * page intentionally does NOT mount the full app — no dashboard, no
 * sidebar, no marketing routes. It only renders branding, a short
 * pitch, an auth-aware launch CTA, and a quick way back to the main
 * domain. The deep workspace OS will be wired into this shell later.
 */
export default function WorkspaceLanding() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-[hsl(222_22%_6%)] text-foreground [color-scheme:dark] relative overflow-hidden">
      <Helmet>
        <title>HustleAI Workspace — your execution OS</title>
        <meta name="description" content="The dedicated execution surface for HustleAI: projects, canvases, agents and deep work. Sign in to launch your workspace." />
        <link rel="canonical" href="https://workspace.hustlaiapp.in/" />
        <meta name="robots" content="noindex,follow" />
      </Helmet>

      {/* ambient gradients */}
      <div className="absolute -top-40 -right-32 w-[520px] h-[520px] rounded-full bg-emerald-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-32 w-[520px] h-[520px] rounded-full bg-violet-500/10 blur-[140px] pointer-events-none" />

      <header className="relative z-10 max-w-6xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-violet-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-4 h-4 text-emerald-950" />
          </div>
          <span className="tracking-tight">HustleAI <span className="text-muted-foreground font-normal">/ Workspace</span></span>
        </div>
        <a
          href={MARKETING_ORIGIN}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          hustlaiapp.in <ArrowUpRight className="w-3 h-3" />
        </a>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 lg:px-10 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-emerald-300 font-semibold mb-6 px-3 py-1 rounded-full border border-emerald-400/30 bg-emerald-400/5">
          <Layers className="w-3 h-3" /> workspace.hustlaiapp.in
        </div>
        <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-5">
          Your dedicated execution surface.
        </h1>
        <p className="text-base lg:text-lg text-muted-foreground max-w-xl mx-auto mb-10">
          Workspace is where the deep work lives — projects, canvases, agents,
          client delivery. We're carving it out of the main app into its own
          focused environment. Stay tuned.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {loading ? (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking session…
            </span>
          ) : user ? (
            <>
              <a
                href={`${MARKETING_ORIGIN}/workspaces`}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold text-sm transition-colors"
              >
                <Rocket className="w-4 h-4" /> Open your workspace
              </a>
              <a
                href={`${MARKETING_ORIGIN}/dashboard`}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-sm"
              >
                Back to dashboard
              </a>
            </>
          ) : (
            <>
              <a
                href={`${MARKETING_ORIGIN}/login?next=/workspaces`}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold text-sm transition-colors"
              >
                <Rocket className="w-4 h-4" /> Sign in to launch
              </a>
              <a
                href={`${MARKETING_ORIGIN}/signup`}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-sm"
              >
                Create an account
              </a>
            </>
          )}
        </div>

        <div className="mt-16 grid sm:grid-cols-3 gap-3 text-left">
          {[
            { t: "Projects", d: "Workspaces, milestones, delivery surfaces." },
            { t: "Canvases", d: "Whiteboards and operating cockpits." },
            { t: "Agents", d: "Assistants that move work forward for you." },
          ].map((it) => (
            <div key={it.t} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
              <div className="font-semibold text-sm mb-1">{it.t}</div>
              <div className="text-xs text-muted-foreground">{it.d}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-6 text-center text-xs text-muted-foreground">
        Powered by HustleAI · <a href={MARKETING_ORIGIN} className="hover:text-foreground">hustlaiapp.in</a>
      </footer>
    </div>
  );
}
