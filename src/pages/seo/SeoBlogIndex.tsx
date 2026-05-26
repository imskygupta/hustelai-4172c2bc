import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import {
  listBlogs,
  listTrendingBlogs,
  listRecentBlogs,
  listMostViewedBlogs,
  type SeoBlogRow,
} from "@/lib/seo-cms";
import { ArrowRight, Eye, Loader2, Sparkles, Workflow } from "lucide-react";
import { StartHereRoadmap } from "@/components/blog/operational/StartHereRoadmap";
import { OPERATIONAL_STACKS } from "@/lib/operational-stacks";
import {
  TrendingRail,
  NewlyPublishedRail,
  MostReadRail,
  MostSavedRail,
} from "@/components/blog/operational/DiscoveryRails";
import { PersonaFilter } from "@/components/blog/operational/PersonaFilter";
import {
  inferPersonas,
  personaMeta,
  type OperatorPersona,
} from "@/components/blog/operational/OperatorPersonas";
import { fetchMostSavedSlugs } from "@/lib/behavior";
import { GlobalActivityRibbon } from "@/components/blog/operational/ActivityRibbon";

export default function SeoBlogIndex() {
  const [allPosts, setAllPosts] = useState<SeoBlogRow[] | null>(null);
  const [trending, setTrending] = useState<SeoBlogRow[]>([]);
  const [recent, setRecent] = useState<SeoBlogRow[]>([]);
  const [mostRead, setMostRead] = useState<SeoBlogRow[]>([]);
  const [mostSaved, setMostSaved] = useState<SeoBlogRow[]>([]);
  const [search, setSearch] = useSearchParams();
  const activePersona = (search.get("persona") as OperatorPersona | null) || null;
  const activeStage = search.get("stage");
  const hasFilter = Boolean(activePersona || activeStage);

  useEffect(() => {
    // Defensive fetch: always resolve UI state, never let a hung/failed
    // promise leave the archive spinner running forever.
    const withTimeout = <T,>(p: Promise<T>, ms = 8000, fallback: T): Promise<T> =>
      Promise.race([
        p.catch((e) => {
          console.warn("[SeoBlogIndex] fetch failed", e);
          return fallback;
        }),
        new Promise<T>((resolve) =>
          setTimeout(() => {
            console.warn("[SeoBlogIndex] fetch timed out after", ms, "ms");
            resolve(fallback);
          }, ms),
        ),
      ]);

    withTimeout(listBlogs(false), 8000, [] as SeoBlogRow[]).then(setAllPosts);
    withTimeout(listTrendingBlogs(6), 8000, [] as SeoBlogRow[]).then(setTrending);
    withTimeout(listRecentBlogs(6), 8000, [] as SeoBlogRow[]).then(setRecent);
    withTimeout(listMostViewedBlogs(6), 8000, [] as SeoBlogRow[]).then(setMostRead);
    (async () => {
      try {
        const slugs = await withTimeout(fetchMostSavedSlugs(6), 6000, [] as string[]);
        if (!slugs.length) return;
        const mod = await import("@/lib/seo-cms");
        const rows = await withTimeout(
          Promise.all(slugs.map((s) => mod.fetchPublishedBlog(s).catch(() => null))),
          8000,
          [] as (SeoBlogRow | null)[],
        );
        setMostSaved(rows.filter(Boolean) as SeoBlogRow[]);
      } catch (e) {
        console.warn("[SeoBlogIndex] most-saved fetch failed", e);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!allPosts) return null;
    if (!activePersona) return allPosts;
    return allPosts.filter((p) =>
      inferPersonas(p.tags ?? [], p.category).includes(activePersona),
    );
  }, [allPosts, activePersona]);

  // Noindex empty filter states. Parameter pages with zero curated results are
  // thin faceted-nav pages — keep them crawlable (follow) but exclude from the
  // index so they don't dilute crawl budget or editorial trust.
  const isEmptyFilterState = hasFilter && filtered !== null && filtered.length === 0;

  const setPersona = (p: OperatorPersona | null) => {
    const next = new URLSearchParams(search);
    if (p) next.set("persona", p);
    else next.delete("persona");
    setSearch(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Operational Guides for Freelancers & Modern Agencies | HustleAI"
        description="Operator handbooks for freelancers, solo hustlers and small agencies — onboarding, proposals, async delivery, automation and Telegram-first workflows."
        path="/insights"
        noindex={isEmptyFilterState}
      />
      <Navbar />
      <main className="pt-24">
        {/* Hero */}
        <section className="px-4 pb-12 md:pb-16 bg-gradient-to-b from-slate-50 via-white to-white">
          <div className="container mx-auto max-w-4xl text-center space-y-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-600 text-xs shadow-sm">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              Operational guides · operator handbook · async-first
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-semibold tracking-tight text-slate-900 leading-[1.05]">
              Operational guides for modern<br className="hidden sm:block" /> freelancers & agencies.
            </h1>
            <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Learn how to onboard clients, automate delivery, manage async workflows and build scalable systems with AI — written for operators, not readers.
            </p>
            <div className="flex items-center justify-center gap-4 pt-2 text-[11.5px] text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-emerald-500" /> Real operators reading right now</span>
              <span className="inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Connected to live tools & templates</span>
            </div>
            <GlobalActivityRibbon className="pt-3" />
          </div>
        </section>

        {/* Persona filter sticky bar */}
        <PersonaFilter active={activePersona} onChange={setPersona} />

        {/* When a persona is selected we narrow to a flat filtered list.
            Otherwise we show the full operational architecture: roadmap → rails → archive. */}
        {activePersona ? (
          <FilteredArchive posts={filtered} persona={activePersona} />
        ) : (
          <>
            <StartHereRoadmap />
            <StacksRail />
            <TrendingRail posts={trending} />
            <MostSavedRail posts={mostSaved} />
            <NewlyPublishedRail posts={recent} />
            <MostReadRail posts={mostRead} />
            <FullArchive posts={allPosts} />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function FullArchive({ posts }: { posts: SeoBlogRow[] | null }) {
  return (
    <section className="px-4 py-14 border-t border-slate-100">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-400 mb-2">All operator handbooks</div>
          <h2 className="text-2xl md:text-3xl font-display font-semibold tracking-tight text-slate-900">
            Browse every guide in the system.
          </h2>
        </div>
        <ArchiveList posts={posts} />
      </div>
    </section>
  );
}

function StacksRail() {
  return (
    <section className="px-4 py-14 border-t border-slate-100">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-emerald-600 mb-2 inline-flex items-center gap-2">
              <Workflow className="w-3 h-3" /> Operational stacks
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-semibold tracking-tight text-slate-900">
              The systems behind the guides.
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              Each stack chains tools and guides into a progression — from first lead to retention.
            </p>
          </div>
          <Link to="/systems" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700">
            All stacks <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {OPERATIONAL_STACKS.map((s) => (
            <Link
              key={s.slug}
              to={`/systems/${s.slug}`}
              className="group rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm transition p-4"
            >
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                {s.stages.length} stages · {s.persona.replace(/-/g, " ")}
              </div>
              <div className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 leading-snug">
                {s.title}
              </div>
              <div className="text-xs text-slate-500 mt-1 line-clamp-2">{s.blurb}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FilteredArchive({ posts, persona }: { posts: SeoBlogRow[] | null; persona: OperatorPersona }) {
  const meta = personaMeta(persona);
  return (
    <section className="px-4 py-12">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-emerald-600 mb-2">
            Filtered: {meta.emoji} {meta.label}
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-semibold tracking-tight text-slate-900">
            Guides for {meta.label.toLowerCase()}.
          </h2>
          <p className="text-slate-500 text-sm mt-1">{meta.blurb}</p>
        </div>
        <ArchiveList posts={posts} />
      </div>
    </section>
  );
}

function ArchiveList({ posts }: { posts: SeoBlogRow[] | null }) {
  if (posts === null) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }
  if (posts.length === 0) {
    return (
      <p className="text-center text-slate-500 py-12 text-sm">
        No guides match this filter yet — new systems are being indexed continuously.
      </p>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <Link
          key={p.id}
          to={`/insights/${p.slug}`}
          className="group block rounded-xl border border-slate-200 bg-white p-5 hover:border-emerald-300 hover:shadow-[0_6px_24px_-12px_rgba(16,185,129,0.25)] transition-all"
        >
          <div className="flex items-center gap-2 mb-2 text-[10.5px] uppercase tracking-wider font-semibold text-slate-500">
            <span>{p.category || "Operations"}</span>
            <span className="opacity-40">·</span>
            <span>{new Date(p.published_at ?? p.updated_at).toLocaleDateString()}</span>
          </div>
          <h3 className="font-display font-semibold text-[16.5px] leading-snug text-slate-900 mb-1.5 line-clamp-2">
            {p.title}
          </h3>
          {p.excerpt && (
            <p className="text-[13px] text-slate-500 leading-relaxed line-clamp-2 mb-3">{p.excerpt}</p>
          )}
          <div className="text-[12px] font-semibold text-slate-900 inline-flex items-center gap-1 group-hover:text-emerald-700 transition-colors">
            Read guide <ArrowRight className="w-3 h-3" />
          </div>
        </Link>
      ))}
    </div>
  );
}