import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Users } from "lucide-react";
import { OPERATOR_STORIES } from "@/lib/operator-stories";
import { OPERATOR_PERSONAS } from "@/components/blog/operational/OperatorPersonas";

export default function StoriesIndex() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Operator Stories — Workflow Setups | HustleAI</title>
        <meta
          name="description"
          content="Workflow setups, not testimonials. How real operators structure their onboarding, delivery and billing systems."
        />
        <link rel="canonical" href="https://hustlaiapp.in/stories" />
      </Helmet>

      <section className="border-b border-border/50 bg-gradient-to-b from-emerald-950/10 to-transparent">
        <div className="container mx-auto max-w-5xl px-6 py-14">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-600 mb-3">
            <Users className="h-3 w-3" /> Operator stories
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight mb-4">
            Workflow setups, not testimonials.
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
            How operators actually structure onboarding, delivery and billing — the systems behind the work, written as setups you can copy.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-6 py-12 grid gap-4 md:grid-cols-2">
        {OPERATOR_STORIES.map((s) => {
          const persona = OPERATOR_PERSONAS.find((p) => p.id === s.persona);
          return (
            <Link
              key={s.slug}
              to={`/stories/${s.slug}`}
              className="group block rounded-2xl border border-border/60 bg-card hover:border-emerald-400/50 transition p-6"
            >
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                {persona ? `${persona.emoji} ${persona.label}` : s.persona} · {s.operator.role}
              </div>
              <h2 className="text-lg md:text-xl font-semibold tracking-tight mb-2 group-hover:text-emerald-500 transition">
                {s.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{s.summary}</p>
              <div className="text-xs text-emerald-600 inline-flex items-center gap-1">
                Read setup <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}