import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedPages, RelatedPosts } from "@/components/seo/RelatedPosts";
import { RelatedTools } from "@/components/seo/RelatedTools";
import {
  fetchTopic, listPagesByTopic, listPostsByTopic, listTools,
  type SeoTopicRow, type SeoPageRow, type SeoBlogRow, type SeoToolRow,
} from "@/lib/seo-cms";
import NotFound from "@/pages/NotFound";
import { Loader2, ArrowRight } from "lucide-react";

export default function TopicHub() {
  const { slug = "" } = useParams();
  const [topic, setTopic] = useState<SeoTopicRow | null | undefined>(undefined);
  const [pages, setPages] = useState<SeoPageRow[]>([]);
  const [posts, setPosts] = useState<SeoBlogRow[]>([]);
  const [tools, setTools] = useState<SeoToolRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = await fetchTopic(slug);
      if (cancelled) return;
      setTopic(t);
      if (!t) return;
      const [pp, qq, tt] = await Promise.all([listPagesByTopic(t.id), listPostsByTopic(t.id, 12), listTools()]);
      if (cancelled) return;
      setPages(pp); setPosts(qq);
      setTools(tt.filter((x) => x.category === t.slug).slice(0, 6));
    })();
    return () => { cancelled = true; };
  }, [slug]);
  if (topic === undefined) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!topic) return <NotFound />;
  const pillar = pages.find((p) => p.is_pillar);
  const supporting = pages.filter((p) => !p.is_pillar);
  const jsonLd = { "@context": "https://schema.org", "@type": "CollectionPage", name: topic.title, description: topic.description, url: `https://hustlaiapp.in/topics/${topic.slug}` };
  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${topic.title} — Guides, Tools & Playbooks | HustleAI`} description={topic.description || `Everything about ${topic.title.toLowerCase()} for freelancers and small agencies.`} path={`/topics/${topic.slug}`} image={topic.cover_image ?? undefined} jsonLd={[jsonLd]} />
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <Breadcrumbs items={[{ label: "Topics", to: "/topics" }, { label: topic.title }]} />
          <header className="mb-10">
            <div className="text-4xl mb-3" aria-hidden>{topic.icon}</div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-3">{topic.title}</h1>
            {topic.description && <p className="text-lg text-muted-foreground max-w-2xl">{topic.description}</p>}
          </header>
          {pillar && (
            <Link to={`/${pillar.slug}`} className="block glass rounded-2xl p-6 mb-10 hover:border-primary/40 transition-colors">
              <div className="text-xs uppercase tracking-wider text-primary mb-2">Pillar guide</div>
              <div className="text-2xl font-display font-bold">{pillar.h1 || pillar.title}</div>
              {pillar.subhead && <p className="text-muted-foreground mt-2">{pillar.subhead}</p>}
              <div className="text-sm text-primary mt-3 inline-flex items-center gap-1">Read pillar <ArrowRight className="w-3 h-3" /></div>
            </Link>
          )}
          <RelatedPages pages={supporting} title="Supporting pages" />
          <RelatedPosts posts={posts} title="Latest insights" />
          <RelatedTools tools={tools} title="Tools in this cluster" />
        </div>
      </main>
      <Footer />
    </div>
  );
}