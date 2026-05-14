import { Link, Navigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Users } from "lucide-react";
import { getStory } from "@/lib/operator-stories";
import { getStack } from "@/lib/operational-stacks";
import { OPERATOR_PERSONAS } from "@/components/blog/operational/OperatorPersonas";

export default function StoryDetail() {
  const { slug = "" } = useParams();
  const story = getStory(slug);
  if (!story) return <Navigate to="/stories" replace />;
  const persona = OPERATOR_PERSONAS.find((p) => p.id === story.persona);
  const stacks = story.stackSlugs.map(getStack).filter(Boolean);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{story.title} | HustleAI Stories</title>
        <meta name="description" content={story.summary} />
        <link rel="canonical" href={`https://hustlaiapp.in/stories/${story.slug}`} />
      </Helmet>

      <section className="border-b border-border/50 bg-gradient-to-b from-emerald-950/10 to-transparent">
        <div className="container mx-auto max-w-3xl px-6 py-12">
          <Link to="/stories" className="text-xs uppercase tracking-[0.2em] text-emerald-600 hover:text-emerald-500 inline-flex items-center gap-2 mb-4">
            <Users className="h-3 w-3" /> Operator stories
          </Link>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-3">
            {story.title}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mb-3">{story.summary}</p>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {persona ? `${persona.emoji} ${persona.label}` : story.persona} · {story.operator.role}
          </div>
          <div className="text-sm text-muted-foreground mt-2 italic">{story.operator.context}</div>
        </div>
      </section>

      <section className="container mx-auto max-w-3xl px-6 py-10">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-4">The setup</h2>
        <ol className="space-y-3">
          {story.steps.map((st, i) => (
            <li key={i} className="rounded-xl border border-border/60 bg-card p-5 flex items-start gap-4">
              <div className="shrink-0 h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-sm font-semibold">
                {i + 1}
              </div>
              <div>
                <div className="font-semibold mb-1">{st.label}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{st.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {stacks.length > 0 && (
        <section className="container mx-auto max-w-3xl px-6 pb-16">
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-4">
            Built on these operational stacks
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {stacks.map((s) => (
              <Link
                key={s!.slug}
                to={`/systems/${s!.slug}`}
                className="rounded-xl border border-border/60 bg-card hover:border-emerald-400/50 p-4 transition group flex items-start justify-between gap-2"
              >
                <div>
                  <div className="font-medium leading-snug group-hover:text-emerald-500">{s!.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{s!.blurb}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 mt-1 shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}