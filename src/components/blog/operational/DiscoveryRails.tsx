import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Eye, Flame, Sparkles, Bookmark } from "lucide-react";
import type { SeoBlogRow } from "@/lib/seo-cms";
import { BookmarkButton } from "@/components/blog/operational/BookmarkButton";
import { fetchBookmarkCounts } from "@/lib/behavior";

function formatViews(n: number): string {
  if (!n || n < 1) return "Just published";
  if (n < 1000) return `${n} operators viewed`;
  return `${(n / 1000).toFixed(1)}k operators viewed`;
}

function PostCard({ p, accent = "emerald", saves }: { p: SeoBlogRow; accent?: "emerald" | "violet" | "amber"; saves?: number }) {
  const tones: Record<string, string> = {
    emerald: "hover:border-emerald-300 hover:shadow-[0_6px_24px_-12px_rgba(16,185,129,0.25)]",
    violet: "hover:border-violet-300 hover:shadow-[0_6px_24px_-12px_rgba(139,92,246,0.25)]",
    amber: "hover:border-amber-300 hover:shadow-[0_6px_24px_-12px_rgba(245,158,11,0.25)]",
  };
  return (
    <div className={`relative group rounded-xl border border-slate-200 bg-white p-5 transition-all ${tones[accent]}`}>
      <div className="absolute top-3 right-3">
        <BookmarkButton slug={p.slug} variant="icon" initialCount={saves} />
      </div>
      <Link to={`/insights/${p.slug}`} className="block">
        <div className="flex items-center gap-2 mb-2 text-[10.5px] uppercase tracking-wider font-semibold text-slate-500 pr-8">
          <span>{p.category || "Operations"}</span>
          <span className="opacity-40">·</span>
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3 h-3" /> {formatViews((p as any).view_count ?? 0)}
          </span>
          {(saves ?? 0) > 0 && (
            <>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1">
                <Bookmark className="w-3 h-3" /> {saves}
              </span>
            </>
          )}
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
    </div>
  );
}

export function DiscoveryRail({
  title,
  subtitle,
  icon: Icon,
  posts,
  accent = "emerald",
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  posts: SeoBlogRow[];
  accent?: "emerald" | "violet" | "amber";
}) {
  if (!posts.length) return null;
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    fetchBookmarkCounts(posts.map((p) => p.slug)).then(setCounts);
  }, [posts]);
  const chip: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    violet:  "bg-violet-100 text-violet-700",
    amber:   "bg-amber-100 text-amber-700",
  };
  return (
    <section className="px-4 py-10">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] uppercase tracking-[0.18em] font-semibold mb-2 ${chip[accent]}`}>
              <Icon className="w-3 h-3" /> {title}
            </div>
            {subtitle && <p className="text-slate-500 text-sm max-w-xl">{subtitle}</p>}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {posts.slice(0, 6).map((p) => (
            <PostCard key={p.id} p={p} accent={accent} saves={counts[p.slug]} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Convenience wrappers so the page reads cleanly. */
export const TrendingRail = (props: { posts: SeoBlogRow[] }) => (
  <DiscoveryRail
    title="Trending operational guides"
    subtitle="What other operators are reading right now."
    icon={Flame}
    accent="amber"
    posts={props.posts}
  />
);

export const NewlyPublishedRail = (props: { posts: SeoBlogRow[] }) => (
  <DiscoveryRail
    title="Recently published systems"
    subtitle="Fresh playbooks from the HustleAI editorial pipeline."
    icon={Sparkles}
    accent="emerald"
    posts={props.posts}
  />
);

export const MostReadRail = (props: { posts: SeoBlogRow[] }) => (
  <DiscoveryRail
    title="Most-read operator handbooks"
    subtitle="Lifetime favorites — the ones operators bookmark."
    icon={Eye}
    accent="violet"
    posts={props.posts}
  />
);

export const MostSavedRail = (props: { posts: SeoBlogRow[] }) => (
  <DiscoveryRail
    title="Most-saved operator systems"
    subtitle="Guides operators bookmark to revisit and run."
    icon={Bookmark}
    accent="emerald"
    posts={props.posts}
  />
);