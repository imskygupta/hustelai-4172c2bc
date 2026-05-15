import { Helmet } from "react-helmet-async";
import {
  ArrowUpRight, Sparkles, Loader2, Command, Rocket,
  PenLine, Users, FileText, Workflow, Bot, LayoutGrid,
  ArrowRight, CornerDownLeft,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { MARKETING_ORIGIN } from "@/lib/host";

/**
 * workspace.hustlaiapp.in — standalone surface.
 *
 * Architecture intent:
 *  - separate product, not a duplicate dashboard
 *  - shares auth only; no admin/marketing/billing logic mounted here
 *  - calm, focused, immersive — Linear / Raycast / Cursor direction
 *  - keep it lightweight: no heavy data fetching, no charts
 */

const capabilities = [
  { icon: PenLine,   title: "AI Canvas",            desc: "Infinite surface for thinking, briefs, and live AI scratchpads." },
  { icon: Users,     title: "Client Rooms",         desc: "Per-client spaces with intake, scope, files, and messages." },
  { icon: FileText,  title: "Proposal Builder",     desc: "Branded proposals with reusable blocks and one-click PDF." },
  { icon: Workflow,  title: "Workflow Automation",  desc: "Chain steps and AI calls. Trigger from intake, email, or webhook." },
  { icon: LayoutGrid,title: "Smart Docs",           desc: "Structured docs with AI commands, embeds, and live blocks." },
  { icon: Bot,       title: "AI Assistants",        desc: "Per-project agents that recall context and move work forward." },
];

const previewBoards = [
  {
    label: "Canvas",
    rows: [
      { kind: "title", text: "Q4 launch — landing concepts" },
      { kind: "tag",   text: "active · 3 collaborators" },
      { kind: "bar",   w: "78%" },
      { kind: "bar",   w: "52%" },
      { kind: "bar",   w: "34%" },
    ],
  },
  {
    label: "Project board",
    rows: [
      { kind: "title", text: "Acme — brand refresh" },
      { kind: "row",   text: "Discovery call",     done: true  },
      { kind: "row",   text: "Moodboard v2",       done: true  },
      { kind: "row",   text: "Logo system",        done: false },
      { kind: "row",   text: "Style guide",        done: false },
    ],
  },
  {
    label: "AI flow",
    rows: [
      { kind: "title", text: "Lead → Proposal" },
      { kind: "step",  text: "Intake submitted" },
      { kind: "step",  text: "Summarize requirements" },
      { kind: "step",  text: "Draft proposal" },
      { kind: "step",  text: "Notify owner on Telegram" },
    ],
  },
];

export default function WorkspaceLanding() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-[hsl(222_22%_5%)] text-foreground [color-scheme:dark] relative overflow-hidden selection:bg-emerald-400/20">
      <Helmet>
        <title>HustleAI Workspace — your AI Operating System</title>
        <meta name="description" content="Your AI Workspace OS. Built for freelancers, operators, and modern teams. Canvas, client rooms, proposals, automation, smart docs, and AI assistants." />
        <link rel="canonical" href="https://workspace.hustlaiapp.in/" />
        <meta name="robots" content="noindex,follow" />
      </Helmet>

      {/* ambient layers */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none [background-image:linear-gradient(hsl(var(--foreground)/0.04)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground)/0.04)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]"
      />
      <div aria-hidden className="absolute -top-40 -right-32 w-[640px] h-[640px] rounded-full bg-emerald-500/[0.07] blur-[160px] pointer-events-none" />
      <div aria-hidden className="absolute -bottom-52 -left-40 w-[640px] h-[640px] rounded-full bg-violet-500/[0.07] blur-[160px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 max-w-6xl mx-auto px-6 lg:px-10 h-14 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2 font-medium text-sm">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-violet-500 flex items-center justify-center shadow-md shadow-emerald-500/10">
            <Sparkles className="w-3.5 h-3.5 text-emerald-950" />
          </div>
          <span className="tracking-tight">HustleAI</span>
          <span className="text-muted-foreground/70">/</span>
          <span className="text-muted-foreground">Workspace</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-muted-foreground border border-white/10 rounded-md px-2 py-1">
            <Command className="w-3 h-3" /> K
          </span>
          <a
            href={MARKETING_ORIGIN}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            hustlaiapp.in <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 lg:px-10 pt-16 lg:pt-24 pb-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-emerald-300/90 font-medium mb-6 px-2.5 py-1 rounded-full border border-emerald-400/20 bg-emerald-400/[0.04]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Workspace OS · early access
          </div>
          <h1 className="text-4xl lg:text-6xl font-semibold tracking-tight leading-[1.05] mb-5">
            Your AI <span className="bg-gradient-to-r from-emerald-300 to-violet-300 bg-clip-text text-transparent">Workspace OS</span>.
          </h1>
          <p className="text-base lg:text-lg text-muted-foreground max-w-xl mb-9 leading-relaxed">
            Built for freelancers, operators, and modern teams. A focused execution
            surface for canvases, client rooms, proposals, automations, docs, and
            AI assistants — without the dashboard noise.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {loading ? (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground h-11">
                <Loader2 className="w-4 h-4 animate-spin" /> Checking session…
              </span>
            ) : user ? (
              <>
                <a
                  href={`${MARKETING_ORIGIN}/workspaces`}
                  className="group inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-medium text-sm transition-colors"
                >
                  <Rocket className="w-4 h-4" /> Open Workspace
                  <ArrowRight className="w-3.5 h-3.5 -mr-1 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </a>
                <a
                  href={`${MARKETING_ORIGIN}/workspaces`}
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-sm font-medium transition-colors"
                >
                  Continue working
                </a>
                <a
                  href={`${MARKETING_ORIGIN}/workspaces?launch=canvas`}
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-sm font-medium transition-colors"
                >
                  <PenLine className="w-3.5 h-3.5" /> Launch AI Canvas
                </a>
              </>
            ) : (
              <>
                <a
                  href={`${MARKETING_ORIGIN}/login?next=/workspaces`}
                  className="group inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-medium text-sm transition-colors"
                >
                  <Rocket className="w-4 h-4" /> Sign in to launch
                  <ArrowRight className="w-3.5 h-3.5 -mr-1 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </a>
                <a
                  href={`${MARKETING_ORIGIN}/signup`}
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-sm font-medium transition-colors"
                >
                  Create an account
                </a>
              </>
            )}
          </div>

          <div className="mt-5 text-[11px] text-muted-foreground inline-flex items-center gap-2">
            <CornerDownLeft className="w-3 h-3" />
            <span>Press <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.04] text-[10px]">Enter</kbd> to launch · keyboard-first by design</span>
          </div>
        </div>

        {/* Preview boards */}
        <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4">
          {previewBoards.map((b) => (
            <div
              key={b.label}
              className="group relative rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4 overflow-hidden hover:border-white/10 transition-colors"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{b.label}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
              </div>
              <div className="space-y-2">
                {b.rows.map((r, i) => {
                  if (r.kind === "title") return <div key={i} className="text-sm font-medium tracking-tight">{r.text}</div>;
                  if (r.kind === "tag") return <div key={i} className="text-[11px] text-muted-foreground">{r.text}</div>;
                  if (r.kind === "bar") return (
                    <div key={i} className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-400/70 to-violet-400/70" style={{ width: r.w }} />
                    </div>
                  );
                  if (r.kind === "row") return (
                    <div key={i} className="flex items-center gap-2 text-[12px]">
                      <span className={`w-3.5 h-3.5 rounded border ${r.done ? "bg-emerald-400/80 border-emerald-300/60" : "border-white/15"}`} />
                      <span className={r.done ? "text-muted-foreground line-through" : ""}>{r.text}</span>
                    </div>
                  );
                  if (r.kind === "step") return (
                    <div key={i} className="flex items-center gap-2 text-[12px]">
                      <span className="w-1 h-1 rounded-full bg-violet-300/80" />
                      <span className="text-muted-foreground">{r.text}</span>
                    </div>
                  );
                  return null;
                })}
              </div>
            </div>
          ))}
        </section>

        {/* Capabilities */}
        <section className="mt-16">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">What lives in Workspace</h2>
              <p className="text-sm text-muted-foreground mt-1">A focused surface for execution. Not another dashboard.</p>
            </div>
            <span className="hidden sm:inline text-[11px] text-muted-foreground">More shipping each week</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {capabilities.map((c) => (
              <div
                key={c.title}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-white/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3">
                  <c.icon className="w-4 h-4 text-emerald-300/90" />
                </div>
                <div className="text-sm font-medium tracking-tight mb-1">{c.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{c.desc}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-6 text-center text-[11px] text-muted-foreground">
        Workspace OS · separate from the main app · shares your HustleAI account ·{" "}
        <a href={MARKETING_ORIGIN} className="hover:text-foreground transition-colors">hustlaiapp.in</a>
      </footer>
    </div>
  );
}
