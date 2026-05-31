import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Rocket, PenSquare, Upload, UserPlus, Sparkles, Compass, ArrowRight, X } from "lucide-react";
import { hasMilestone } from "@/lib/onboarding/firstSession";

/**
 * WelcomeActionGrid — action-oriented empty state for first-time dashboard
 * visitors. Replaces the "No data yet" placeholder feeling with six concrete
 * next moves. Self-hides once the user has created their first project, or
 * if they dismiss it on this device.
 */

const ACTIONS = [
  { icon: Rocket,    title: "Create your first project", desc: "Spin up a workspace with starter tasks.",          href: "/projects/new" },
  { icon: PenSquare, title: "Open Canvas",               desc: "Brainstorm with AI on a free-form canvas.",        href: "/canvas" },
  { icon: Upload,    title: "Upload your first file",    desc: "Drop a brief, contract or asset to get going.",    href: "/dashboard?tab=files" },
  { icon: UserPlus,  title: "Invite a teammate",         desc: "Bring a collaborator into your workspace.",        href: "/settings/workspace" },
  { icon: Sparkles,  title: "Try the AI assistant",      desc: "Ask HustleAI to draft, summarize or plan for you.", href: "/hustlebot" },
  { icon: Compass,   title: "Explore the toolkit",       desc: "Browse the AI tools and templates library.",        href: "/ai-tools" },
];

const DISMISS_KEY = "hai:welcome-grid:dismissed";

export default function WelcomeActionGrid() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    if (hasMilestone("first_project")) return;
    setShow(true);
  }, []);

  if (!show) return null;

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    setShow(false);
  }

  return (
    <section className="relative rounded-2xl border border-border/50 bg-card/40 p-5 sm:p-6">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-muted-foreground/70 hover:text-foreground p-1"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
        <Sparkles className="h-3 w-3 text-emerald-500" /> Start here
      </div>
      <h2 className="text-base sm:text-lg font-semibold tracking-tight">Pick a move to set up your workspace</h2>
      <p className="text-xs text-muted-foreground mt-1 mb-4">Each card opens a real screen — nothing demo, nothing locked.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {ACTIONS.map(a => {
          const Icon = a.icon;
          return (
            <Link
              key={a.title}
              to={a.href}
              className="group rounded-xl border border-border/50 bg-background/40 p-3.5 hover:border-emerald-500/50 hover:bg-emerald-500/[0.03] transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="inline-flex h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-emerald-500/15 to-violet-500/10 items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-emerald-600" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium tracking-tight">{a.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{a.desc}</div>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all mt-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}