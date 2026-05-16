import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, ArrowUpRight, Compass } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * DashboardHero — emotional, exploratory entrypoint.
 *
 * Sells *possibility* (the dashboard's job), while the workspace sells *focus*.
 * Lighter motion than the workspace shell: a single soft mesh sweep, a
 * rotating prompt line, a breathing dot, and a magnetic Explore CTA.
 *
 * No fake metrics, no nagging — just one calm sentence about what the
 * operator could build next.
 */

const PROMPTS = [
  "What are you building next?",
  "See what operators are shipping.",
  "Find systems worth cloning.",
  "Discover real workflows.",
  "Quietly building your empire.",
];

const MICRO = [
  "Momentum detected.",
  "Let the systems cook.",
  "No provider? Gemini works great.",
  "Operators are shipping today.",
  "One idea away.",
];

function pickStable<T>(arr: T[], seed: string): T {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[n % arr.length];
}

export default function DashboardHero() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const name = profile?.display_name?.split(" ")[0] || "operator";

  // Rotate the prompt every ~5s; calm, not flashy.
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setIdx((i) => (i + 1) % PROMPTS.length), 5200);
    return () => clearInterval(t);
  }, []);

  // Stable per-session microcopy so the tagline doesn't flicker on render.
  const micro = useMemo(() => pickStable(MICRO, user?.id || name), [user?.id, name]);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-emerald-50/30 to-violet-50/40 dark:border-slate-800/70 dark:from-slate-950 dark:via-slate-950 dark:to-violet-950/30">
      {/* Soft animated mesh — hidden on mobile to keep GPU calm */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0.55 }}
        animate={{ opacity: [0.45, 0.7, 0.45], x: ["-4%", "4%", "-4%"] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-300/30 via-sky-300/20 to-violet-300/30 blur-3xl hidden sm:block"
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0.4 }}
        animate={{ opacity: [0.3, 0.55, 0.3], x: ["2%", "-2%", "2%"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-gradient-to-br from-violet-300/25 via-fuchsia-300/15 to-amber-200/25 blur-3xl hidden sm:block"
      />

      {/* Algorithmic glyph — barely visible, hand-of-machine feel */}
      <svg aria-hidden className="pointer-events-none absolute right-6 top-6 h-20 w-20 text-emerald-500/15" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.6">
        <circle cx="50" cy="50" r="32" />
        <circle cx="50" cy="50" r="22" />
        <path d="M18 50h64M50 18v64M28 28l44 44M72 28L28 72" />
      </svg>

      <div className="relative px-5 py-7 sm:px-7 sm:py-9">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-emerald-700/80 dark:text-emerald-300/80">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          {micro}
        </div>

        <div className="mt-3 min-h-[2.4em]">
          <AnimatePresence mode="wait">
            <motion.h1
              key={idx}
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="font-display text-[26px] sm:text-[34px] leading-[1.1] tracking-tight text-slate-900 dark:text-white"
            >
              {PROMPTS[idx]}
            </motion.h1>
          </AnimatePresence>
        </div>

        <p className="mt-2 max-w-xl text-[13px] sm:text-sm text-slate-600 dark:text-slate-400">
          Welcome back, {name}. The dashboard is your <span className="text-slate-900 dark:text-white font-medium">discovery engine</span> — when you're ready to ship, the workspace is one click away.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate("/explore")}
            className="group relative inline-flex items-center gap-2 rounded-full bg-slate-900 dark:bg-white px-4 py-2 text-[13px] font-medium text-white dark:text-slate-900 shadow-lg shadow-slate-900/10 transition-transform hover:-translate-y-0.5"
          >
            <Search className="h-3.5 w-3.5" />
            Explore the idea engine
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            <span aria-hidden className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-emerald-400/40 via-violet-400/40 to-fuchsia-400/40 opacity-0 blur-md transition-opacity group-hover:opacity-100" />
          </button>
          <button
            onClick={() => navigate("/hustlebot")}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/60 dark:bg-slate-900/40 dark:border-slate-700/70 px-3.5 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-500" />
            Ask the bot what to build
          </button>
          <button
            onClick={() => navigate("/operations")}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <Compass className="h-3.5 w-3.5" />
            Tour the OS
          </button>
        </div>

        {/* Hand-scribbled signal line — graffiti accent, barely there */}
        <svg aria-hidden className="pointer-events-none absolute bottom-3 left-5 h-3 w-44 text-emerald-500/25" viewBox="0 0 200 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <path d="M2 8 q10 -8 22 0 t22 0 t22 0 t22 0 t22 0 t22 0 t22 0 t22 0" />
        </svg>
      </div>
    </section>
  );
}
