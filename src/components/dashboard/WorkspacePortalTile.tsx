import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Briefcase, Cpu, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { appUrl } from "@/lib/host";

/**
 * WorkspacePortalTile — cinematic entry into the execution OS.
 *
 * Replaces the small "Open Workspace" button with a depth-rich portal that
 * shows the operator's *actual* recent projects + provider state. Clicking
 * opens the workspace in a new tab (premium handoff already in place).
 *
 * Lives on the dashboard only — workspace is the focused execution zone,
 * dashboard is the launchpad. Performance: one CSS-driven sweep, one
 * breathing dot, no canvas, no parallax loops.
 */

type Project = { id: string; client_name: string; pipeline_stage: string | null; updated_at: string };

export default function WorkspacePortalTile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [provider, setProvider] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const [{ data: ws }, { data: providers }] = await Promise.all([
          (supabase as any)
            .from("workspaces")
            .select("id,client_name,pipeline_stage,updated_at")
            .eq("owner_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(3),
          (supabase as any)
            .from("ai_providers")
            .select("provider,model")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .limit(1),
        ]);
        setProjects(ws || []);
        if (providers && providers[0]) setProvider(providers[0].model || providers[0].provider);
      } catch { /* silent — tile still works empty */ }
    })();
  }, [user?.id]);

  function launch(path = "/workspaces") {
    const target = appUrl(path);
    if (target.startsWith("http")) {
      window.open(target, "_blank", "noopener,noreferrer");
    } else {
      navigate(path);
    }
  }

  const hasProjects = projects.length > 0;
  const headline = hasProjects ? "Continue operations" : "Enter your execution OS";
  const sub = hasProjects
    ? "Your projects are warm. Pick up where you left off."
    : "A calm, focused surface for the work clients pay for.";

  return (
    <section
      onClick={() => launch()}
      className="group relative overflow-hidden rounded-2xl p-[1.5px] cursor-pointer bg-gradient-to-r from-emerald-400/70 via-violet-500/70 to-fuchsia-500/70 shadow-[0_0_32px_rgba(124,58,237,0.18)] hover:shadow-[0_0_48px_rgba(124,58,237,0.28)] transition-shadow"
    >
      <div className="relative rounded-[14px] bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950/80 overflow-hidden">
        {/* Light sweep on hover */}
        <div aria-hidden className="pointer-events-none absolute -inset-y-10 -left-1/3 w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent translate-x-[-100%] group-hover:translate-x-[260%] transition-transform duration-[1400ms] ease-out" />
        {/* Ambient orbs */}
        <motion.div aria-hidden initial={{ opacity: 0.5 }} animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-16 -right-12 w-56 h-56 rounded-full bg-violet-500/25 blur-3xl pointer-events-none" />
        <motion.div aria-hidden initial={{ opacity: 0.4 }} animate={{ opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />

        {/* Pulse traces — cyber accent, barely visible */}
        <svg aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full text-violet-400/20" viewBox="0 0 800 40" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="0.7">
          <path d="M0 28 L120 28 L132 14 L156 32 L180 28 L300 28 L314 18 L334 30 L360 28 L500 28 L516 12 L538 32 L560 28 L800 28" />
        </svg>

        <div className="relative grid lg:grid-cols-[1fr_auto] gap-5 p-5 sm:p-6 items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-emerald-300/90 mb-2">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Workspace · Execution OS
              {provider && (
                <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/5 text-violet-200/90 text-[9px] tracking-normal normal-case">
                  <Cpu className="w-2.5 h-2.5" /> {provider}
                </span>
              )}
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-white leading-tight tracking-tight">
              {headline}
            </h2>
            <p className="text-[13px] text-slate-300 mt-1 max-w-md">{sub}</p>

            {hasProjects && (
              <div className="mt-4 flex flex-wrap gap-2">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={(e) => { e.stopPropagation(); launch(`/workspaces/${p.id}`); }}
                    className="group/p inline-flex items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-2.5 py-1.5 text-[12px] text-slate-200 transition-colors backdrop-blur-sm"
                  >
                    <Briefcase className="w-3 h-3 text-emerald-300/80" />
                    <span className="truncate max-w-[140px]">{p.client_name}</span>
                    {p.pipeline_stage && (
                      <span className="text-[10px] text-slate-400/80 capitalize">· {p.pipeline_stage.replace(/_/g, " ")}</span>
                    )}
                    <ArrowUpRight className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover/p:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); launch(); }}
              className="inline-flex items-center gap-2 rounded-full bg-white text-slate-900 hover:bg-emerald-50 font-semibold shadow-lg px-4 py-2 text-[13px] transition-transform group-hover:translate-x-0.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              {hasProjects ? "Resume work" : "Launch workspace"}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
