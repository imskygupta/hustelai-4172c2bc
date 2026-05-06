import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { listTopics, type SeoTopicRow } from "@/lib/seo-cms";
import { Loader2, ArrowRight } from "lucide-react";

export default function TopicsIndex() {
  const [topics, setTopics] = useState<SeoTopicRow[] | null>(null);
  useEffect(() => { listTopics().then((t) => setTopics(t.filter((x) => x.is_published))); }, []);
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Topics — Freelancer CRM, AI Workspace, Client Onboarding | HustleAI"
        description="Topic clusters for freelancers and small agencies — CRM, onboarding, invoicing, productivity and agency operations playbooks."
        path="/topics"
      />
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <Breadcrumbs items={[{ label: "Topics" }]} />
          <header className="mb-10">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-3">Topics</h1>
            <p className="text-muted-foreground max-w-2xl">Authority hubs that group every guide, page and tool around a single freelancer outcome.</p>
          </header>
          {topics === null ? (
            <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {topics.map((t) => (
                <Link key={t.id} to={`/topics/${t.slug}`} className="glass rounded-xl p-6 hover:border-primary/40 transition-colors">
                  <div className="text-3xl mb-2" aria-hidden>{t.icon}</div>
                  <h2 className="text-xl font-display font-bold mb-1">{t.title}</h2>
                  {t.description && <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>}
                  <div className="text-sm text-primary mt-3 inline-flex items-center gap-1">Explore cluster <ArrowRight className="w-3 h-3" /></div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}