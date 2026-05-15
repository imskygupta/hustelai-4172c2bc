import { Link, useOutletContext } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import * as Icons from "lucide-react";
import { ArrowRight, ArrowDown, Sparkles, Zap, Rocket } from "lucide-react";
import type { DocsCategory, DocsPage } from "@/integrations/docs/client";
import { CATEGORY_STYLE, DOCS_JOURNEY } from "@/data/docs/rich-content";

type Ctx = { cats: DocsCategory[]; pages: DocsPage[] };

const FALLBACK_STYLE = {
  gradient: "from-primary/15 via-card to-card",
  ring: "ring-primary/30",
  chip: "bg-primary/10 text-primary",
  tagline: "",
};

export default function DocsHome() {
  const { cats, pages } = useOutletContext<Ctx>();

  // Order categories by the recommended journey, falling back to sort_order
  const ordered = [...cats].sort((a, b) => {
    const ai = DOCS_JOURNEY.indexOf(a.slug);
    const bi = DOCS_JOURNEY.indexOf(b.slug);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return (
    <div className="space-y-14">
      <Helmet>
        <title>HustleAI Workspace OS — Documentation</title>
        <meta name="description" content="Learn how to use HustleAI: workspaces, CRM, invoices, AI Fuel, proposals, intake forms, client portals, billing, and more." />
        <link rel="canonical" href="https://docs.hustlaiapp.in/" />
      </Helmet>

      {/* Gradient hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-emerald-500/10 via-violet-500/10 to-rose-500/10 p-8 lg:p-14">
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-emerald-400/20 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 w-96 h-96 rounded-full bg-violet-400/20 blur-[120px] pointer-events-none" />

        <div className="relative">
          <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-emerald-300 font-semibold mb-4 px-2.5 py-1 rounded-full border border-emerald-400/30 bg-emerald-400/5">
            <Sparkles className="w-3 h-3" /> docs.hustlaiapp.in
          </div>
          <h1 className="text-3xl lg:text-5xl font-bold tracking-tight mb-3 max-w-3xl">
            Build your freelance practice on a single, AI-augmented Workspace OS.
          </h1>
          <p className="text-muted-foreground max-w-2xl text-base lg:text-lg">
            Step-by-step guides, tool walkthroughs, real-world use cases and recipes for every module of HustleAI — from your first client to your hundredth.
          </p>

          <div className="flex flex-wrap gap-2 mt-6">
            <Link
              to="/quickstart"
              className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-medium text-sm transition-colors"
            >
              <Rocket className="w-4 h-4" /> Quickstart in 10 min
            </Link>
            <Link
              to="/what-is-ai-fuel"
              className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-foreground text-sm transition-colors"
            >
              <Zap className="w-4 h-4 text-amber-400" /> What is AI Fuel?
            </Link>
          </div>
        </div>
      </section>

      {/* Journey strip — visual flow connector */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">The recommended journey</h2>
          <span className="text-xs text-muted-foreground hidden sm:inline">Follow the arrows ↗</span>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          <div className="flex flex-wrap items-center gap-1.5">
            {DOCS_JOURNEY.slice(0, 8).map((slug, i, arr) => {
              const c = cats.find((x) => x.slug === slug);
              if (!c) return null;
              const first = pages.find((p) => p.category_id === c.id);
              const style = CATEGORY_STYLE[c.slug] ?? FALLBACK_STYLE;
              const Icon = (Icons as any)[c.icon] ?? Icons.BookOpen;
              return (
                <div key={slug} className="flex items-center gap-1.5">
                  <Link
                    to={first ? `/${first.slug}` : "/"}
                    className={`group inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-white/10 bg-gradient-to-br ${style.gradient} hover:ring-2 ${style.ring} hover:scale-[1.04] transition-all text-xs font-medium`}
                  >
                    <Icon className="w-3.5 h-3.5 opacity-80" />
                    <span>{c.title}</span>
                  </Link>
                  {i < arr.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Category tiles */}
      <section>
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-xl font-semibold">Browse by category</h2>
            <p className="text-sm text-muted-foreground mt-1">Every tile expands into use cases, how-to-use steps and power tips.</p>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">{cats.length} categories</span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ordered.map((c) => {
            const Icon = (Icons as any)[c.icon] ?? Icons.BookOpen;
            const first = pages.find((p) => p.category_id === c.id);
            const count = pages.filter((p) => p.category_id === c.id).length;
            const style = CATEGORY_STYLE[c.slug] ?? FALLBACK_STYLE;
            return (
              <Link
                key={c.id}
                to={first ? `/${first.slug}` : "/"}
                className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br ${style.gradient} p-5 flex flex-col gap-3 transition-all hover:scale-[1.02] hover:border-white/15 hover:shadow-2xl hover:shadow-black/30`}
              >
                {/* glow blob */}
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/[0.04] blur-2xl pointer-events-none group-hover:bg-white/[0.08] transition-colors" />

                <div className="relative flex items-start justify-between gap-3">
                  <div className={`w-11 h-11 rounded-xl ${style.chip} flex items-center justify-center backdrop-blur-sm`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </div>

                <div className="relative">
                  <div className="font-semibold text-base">{c.title}</div>
                  {style.tagline && (
                    <div className="text-[11px] uppercase tracking-wider font-medium opacity-70 mt-0.5">{style.tagline}</div>
                  )}
                </div>

                <div className="relative text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                  {c.description}
                </div>

                <div className="relative flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2 border-t border-white/5">
                  <span>{count} article{count === 1 ? "" : "s"}</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-foreground">
                    Open <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA strip */}
      <section className="rounded-2xl border border-white/5 bg-gradient-to-r from-emerald-500/10 via-violet-500/10 to-transparent p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="font-semibold">Need something we don't cover?</div>
          <div className="text-sm text-muted-foreground mt-0.5">Ping the team or open the in-app HustleBot AI mentor — it knows every doc.</div>
        </div>
        <div className="flex gap-2">
          <a href="https://hustlaiapp.in/contact" className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-sm">Contact support</a>
          <a href="https://hustlaiapp.in/dashboard" className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-sm font-medium">
            Open the app <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>
    </div>
  );
}