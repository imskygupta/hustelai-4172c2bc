import { Link, useOutletContext } from "react-router-dom";
import * as Icons from "lucide-react";
import type { DocsCategory, DocsPage } from "@/integrations/docs/client";
import { SEO } from "@/components/SEO";

type Ctx = { cats: DocsCategory[]; pages: DocsPage[] };

export default function DocsHome() {
  const { cats, pages } = useOutletContext<Ctx>();

  return (
    <div className="space-y-12">
      <SEO
        title="HustleAI Workspace OS — Documentation"
        description="Learn how to use HustleAI: workspaces, CRM, invoices, AI Fuel, proposals, intake forms, client portals, billing, and more."
        path="/docs"
      />

      <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-8 lg:p-12">
        <div className="text-xs uppercase tracking-widest text-primary mb-3 font-semibold">
          docs.hustlaiapp.in
        </div>
        <h1 className="text-3xl lg:text-5xl font-bold tracking-tight mb-3">
          HustleAI Workspace OS Docs
        </h1>
        <p className="text-muted-foreground max-w-2xl text-base lg:text-lg">
          Everything you need to operate your freelance business with HustleAI —
          from your first invoice to bringing your own AI keys.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Browse by category</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cats.map((c) => {
            const Icon = (Icons as any)[c.icon] ?? Icons.BookOpen;
            const first = pages.find((p) => p.category_id === c.id);
            const count = pages.filter((p) => p.category_id === c.id).length;
            return (
              <Link
                key={c.id}
                to={first ? `/docs/${first.slug}` : "/docs"}
                className="group rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all p-5 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="font-semibold">{c.title}</div>
                </div>
                <div className="text-sm text-muted-foreground line-clamp-2">
                  {c.description}
                </div>
                <div className="text-xs text-muted-foreground mt-auto">
                  {count} article{count === 1 ? "" : "s"}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}