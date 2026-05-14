import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Layers, Workflow } from "lucide-react";
import { OPERATIONAL_STACKS } from "@/lib/operational-stacks";
import { OPERATOR_PERSONAS } from "@/components/blog/operational/OperatorPersonas";

export default function SystemsIndex() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Operational Stacks for Freelancers & Solo Agencies | HustleAI</title>
        <meta
          name="description"
          content="Curated operator stacks — onboarding, delivery, invoicing and retention systems freelancers and lean agencies actually run."
        />
        <link rel="canonical" href="https://hustlaiapp.in/systems" />
      </Helmet>

      <section className="border-b border-border/50 bg-gradient-to-b from-emerald-950/10 to-transparent">
        <div className="container mx-auto max-w-5xl px-6 py-14">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-600 mb-3">
            <Workflow className="h-3 w-3" /> Operational stacks
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight mb-4">
            The operating systems behind independent businesses.
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
            Stacks are the human-readable map of how operators actually run their work — from first lead to retention. Each stack chains tools and guides into a progression you can copy and adapt.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-6 py-12 space-y-4">
        {OPERATIONAL_STACKS.map((s) => {
          const persona = OPERATOR_PERSONAS.find((p) => p.id === s.persona);
          return (
            <Link
              key={s.slug}
              to={`/systems/${s.slug}`}
              className="group block rounded-2xl border border-border/60 bg-card hover:border-emerald-400/50 transition p-6"
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                    <Layers className="h-3 w-3" />
                    {persona ? `${persona.emoji} ${persona.label}` : s.persona}
                    <span className="text-border">·</span>
                    <span>{s.stages.length} stages</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-2 group-hover:text-emerald-500 transition">
                    {s.title}
                  </h2>
                  <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed mb-4">
                    {s.blurb}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {s.stages.map((st, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-1 rounded-full bg-muted/50 text-muted-foreground border border-border/40"
                      >
                        {i + 1}. {st.label}
                      </span>
                    ))}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-500 mt-1 shrink-0" />
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}