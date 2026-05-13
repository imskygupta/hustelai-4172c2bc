import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AUTHORITY_PAGES } from "@/lib/authority-pages";
import { ArrowRight } from "lucide-react";

export default function AuthorityIndex() {
  return (
    <main className="min-h-screen bg-background pt-24 pb-24">
      <Helmet>
        <title>Operational Systems · HustleAI</title>
        <meta name="description" content="Operational systems behind HustleAI — async delivery, proposal workflows, operational CRM, Telegram delivery, and workspace automation." />
        <link rel="canonical" href="https://hustlaiapp.in/systems" />
      </Helmet>
      <div className="mx-auto max-w-3xl px-6">
        <header className="border-b border-border/60 pb-10 mb-12">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Operational Systems</p>
          <h1 className="mt-3 text-3xl md:text-4xl font-display font-semibold">How HustleAI actually runs</h1>
          <p className="mt-4 text-muted-foreground">Operational explainers — not marketing. One system per page.</p>
        </header>
        <ul className="space-y-6">
          {AUTHORITY_PAGES.map((p) => (
            <li key={p.slug} className="border-b border-border/40 pb-6">
              <Link to={`/systems/${p.slug}`} className="block group">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{p.eyebrow}</p>
                <h2 className="mt-1 text-xl font-semibold group-hover:underline">{p.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{p.summary}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary">Read system <ArrowRight className="w-3 h-3" /></span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
