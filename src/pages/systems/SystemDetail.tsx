import { Link, useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, CheckCircle2, Layers, Workflow } from "lucide-react";
import { getStack, OPERATIONAL_STACKS } from "@/lib/operational-stacks";
import { OPERATOR_PERSONAS } from "@/components/blog/operational/OperatorPersonas";
import { OPERATOR_STORIES } from "@/lib/operator-stories";

export default function SystemDetail() {
  const { slug = "" } = useParams();
  const stack = getStack(slug);
  if (!stack) return <Navigate to="/systems" replace />;

  const persona = OPERATOR_PERSONAS.find((p) => p.id === stack.persona);
  const related = (stack.related ?? [])
    .map((s) => OPERATIONAL_STACKS.find((x) => x.slug === s))
    .filter(Boolean);
  const stories = OPERATOR_STORIES.filter((s) => s.stackSlugs.includes(stack.slug));

  const url = `https://hustlaiapp.in/systems/${stack.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: stack.title,
    description: stack.seoTagline,
    step: stack.stages.map((st, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: st.label,
      text: st.outcome,
    })),
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{stack.title} | HustleAI Systems</title>
        <meta name="description" content={stack.seoTagline} />
        <link rel="canonical" href={url} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <section className="border-b border-border/50 bg-gradient-to-b from-emerald-950/10 to-transparent">
        <div className="container mx-auto max-w-4xl px-6 py-12">
          <Link
            to="/systems"
            className="text-xs uppercase tracking-[0.2em] text-emerald-600 hover:text-emerald-500 inline-flex items-center gap-2 mb-4"
          >
            <Workflow className="h-3 w-3" /> Operational stacks
          </Link>
          <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight mb-4">
            {stack.title}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mb-4">
            {stack.blurb}
          </p>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Layers className="h-3 w-3" />
            {persona ? `${persona.emoji} ${persona.label}` : stack.persona}
            <span className="text-border">·</span>
            <span>{stack.stages.length} stages</span>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-4xl px-6 py-12">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-6">
          Stack progression
        </h2>
        <ol className="space-y-3">
          {stack.stages.map((st, i) => (
            <li
              key={i}
              className="rounded-xl border border-border/60 bg-card p-5 flex items-start gap-4"
            >
              <div className="shrink-0 h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-sm font-semibold">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold mb-1">{st.label}</div>
                <p className="text-sm text-muted-foreground mb-3 flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  {st.outcome}
                </p>
                {st.tool && (
                  <Link
                    to={st.tool.to}
                    className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-500"
                  >
                    Use {st.tool.label} <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {stories.length > 0 && (
        <section className="container mx-auto max-w-4xl px-6 pb-12">
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-4">
            How operators run this stack
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {stories.map((s) => (
              <Link
                key={s.slug}
                to={`/stories/${s.slug}`}
                className="rounded-xl border border-border/60 bg-card hover:border-emerald-400/50 p-4 transition group"
              >
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                  {s.operator.role}
                </div>
                <div className="font-medium leading-snug group-hover:text-emerald-500">
                  {s.title}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="container mx-auto max-w-4xl px-6 pb-16">
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-4">
            Related stacks
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r!.slug}
                to={`/systems/${r!.slug}`}
                className="rounded-xl border border-border/60 bg-card hover:border-emerald-400/50 p-4 transition group"
              >
                <div className="font-medium leading-snug group-hover:text-emerald-500">
                  {r!.title}
                </div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{r!.blurb}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}