import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { blogApi } from "@/integrations/blog/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/**
 * Blog Operations — single command center inside the main admin dashboard.
 * Surfaces drafts, publish queue, image pipeline status, sitemap + indexing health,
 * and regenerate controls.  Lives at /admin/blog/operations.
 */
export default function BlogOperations() {
  const [stats, setStats] = useState<any>(null);
  const [seo, setSeo]   = useState<any>(null);
  const [sched, setSched] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [busy, setBusy]   = useState(false);
  const [filter, setFilter] = useState<"all" | "missing" | "external" | "internal">("all");
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [lastOk, setLastOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const [s, h, q] = await Promise.all([
        blogApi.imageStatus().catch((e: any) => ({ ok: false, error: String(e?.message ?? e) })),
        blogApi.seoHealth().catch(() => null),
        blogApi.schedulerStats().catch(() => null),
      ]);
      if (s?.ok === false) {
        setPipelineError(s.error || "Pipeline unavailable");
        setStats(null); setPosts([]);
      } else {
        setPipelineError(null);
        setStats(s.stats); setPosts(s.posts ?? []);
        if (s.stats?.last_successful_run) setLastOk(s.stats.last_successful_run);
      }
      setSeo(h); setSched(q);
    } catch (e: any) {
      setPipelineError(String(e?.message ?? e));
      toast.error(String(e.message ?? e));
    } finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  const internalPrefix = "/storage/v1/object/public/blog-assets/";
  const filtered = posts.filter(p => {
    if (filter === "all") return true;
    if (filter === "missing")  return !p.hero_image;
    if (filter === "external") return p.hero_image && !p.hero_image.includes(internalPrefix);
    if (filter === "internal") return p.hero_image?.includes(internalPrefix);
    return true;
  });

  const regen = async (id: string, customUrl?: string) => {
    setBusy(true);
    try { await blogApi.regenerateHero(id, customUrl ? { custom_url: customUrl, force: true } : { force: true }); toast.success("Queued — refresh shortly"); }
    catch (e: any) { toast.error(String(e.message ?? e)); }
    finally { setBusy(false); }
  };

  const migrate = async () => {
    setBusy(true);
    try { const r = await blogApi.migrateHeroes(25); toast.success(`Queued ${r.queued} posts`); }
    catch (e: any) { toast.error(String(e.message ?? e)); }
    finally { setBusy(false); }
  };

  const ensure = async () => {
    setBusy(true);
    try { await blogApi.ensureBucket(); toast.success("Bucket ready"); }
    catch (e: any) { toast.error(String(e.message ?? e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-medium">Blog operations</h1>
          <span className="text-xs text-muted-foreground">image pipeline · drafts · indexing</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost"><Link to="/admin/blog">Editorial →</Link></Button>
          <Button asChild size="sm" variant="ghost"><Link to="/admin/blog/seo">SEO health →</Link></Button>
          <Button size="sm" variant="outline" onClick={ensure} disabled={busy}>Ensure bucket</Button>
          <Button size="sm" onClick={migrate} disabled={busy}>Migrate heroes</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {pipelineError && (
          <section className="rounded-md border border-rose-500/40 bg-rose-500/5 p-4 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium text-rose-500">Pipeline unavailable</div>
              <div className="text-xs text-muted-foreground">
                {pipelineError === "ENV_VALIDATION_FAILED" && "Required environment variables are missing. Check Lovable Cloud secrets."}
                {pipelineError === "BUCKET_ACCESS_FAILED" && "Could not reach the blog-assets storage bucket."}
                {pipelineError === "forbidden" && "Admin session expired — sign in again."}
                {!["ENV_VALIDATION_FAILED","BUCKET_ACCESS_FAILED","forbidden"].includes(pipelineError) && pipelineError}
              </div>
              {lastOk && <div className="text-[11px] text-muted-foreground">Last successful run · {new Date(lastOk).toLocaleString()}</div>}
            </div>
            <Button size="sm" variant="outline" onClick={reload} disabled={loading}>{loading ? "Retrying…" : "Retry"}</Button>
          </section>
        )}

        {/* Pipeline diagnostics */}
        <section className="rounded-md border border-border/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm">Pipeline diagnostics</h2>
            <Button size="sm" variant="ghost" onClick={reload} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <Diag label="Storage bucket" value={stats?.bucket_status ?? (pipelineError ? "unknown" : "—")}
                  tone={stats?.bucket_status === "ok" ? "success" : stats?.bucket_status ? "warn" : "danger"} />
            <Diag label="AI provider" value={stats?.provider_available ? "available" : pipelineError ? "unknown" : "missing key"}
                  tone={stats?.provider_available ? "success" : "warn"} />
            <Diag label="Queued ingestion" value={stats?.queued ?? "—"} />
            <Diag label="Failed jobs" value={stats?.failed ?? "—"} tone={stats?.failed ? "warn" : undefined} />
            <Diag label="Last generated image" value={stats?.last_generated_at ? new Date(stats.last_generated_at).toLocaleString() : "never"} />
            <Diag label="Migration progress" value={stats ? `${stats.migration_progress_pct}%` : "—"} tone={stats?.migration_progress_pct === 100 ? "success" : undefined} />
          </div>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Total posts" value={stats?.total ?? "—"} />
          <Stat label="Hosted on CDN" value={stats?.with_internal ?? "—"} tone="success" />
          <Stat label="External hotlinks" value={stats?.with_external ?? "—"} tone="warn" />
          <Stat label="Missing hero" value={stats?.missing ?? "—"} tone="danger" />
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Published today" value={sched?.stats?.published_today ?? "—"} />
          <Stat label="Scheduled" value={sched?.stats?.scheduled ?? "—"} />
          <Stat label="In review" value={sched?.stats?.in_review ?? "—"} />
          <Stat label="Drafts in flight" value={sched?.stats?.drafts ?? "—"} />
        </section>

        {seo && (
          <section className="grid sm:grid-cols-3 gap-4">
            <Stat label="Indexed pages" value={seo?.indexed ?? seo?.summary?.indexed ?? "—"} />
            <Stat label="Sitemap entries" value={seo?.sitemap_count ?? seo?.summary?.sitemap ?? "—"} />
            <Stat label="SEO issues" value={seo?.issues?.length ?? "—"} tone={seo?.issues?.length ? "warn" : "success"} />
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm">Hero image queue</h2>
            <div className="flex gap-1 text-xs">
              {(["all", "missing", "external", "internal"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-2 py-1 rounded border ${filter === f ? "border-foreground bg-muted/40" : "border-border/60 text-muted-foreground"}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="border border-border/60 rounded-md overflow-hidden">
            {filtered.length === 0 && <div className="p-6 text-sm text-muted-foreground">No posts in this view.</div>}
            {filtered.map(p => (
              <PostRow key={p.id} post={p} busy={busy} onRegen={regen} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Diag({ label, value, tone }: { label: string; value: any; tone?: "success" | "warn" | "danger" }) {
  const color = tone === "success" ? "text-emerald-500" : tone === "warn" ? "text-amber-500" : tone === "danger" ? "text-rose-500" : "text-foreground";
  return (
    <div className="rounded border border-border/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm mt-0.5 ${color}`}>{String(value)}</div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: any; tone?: "success" | "warn" | "danger" }) {
  const color = tone === "success" ? "text-emerald-500" : tone === "warn" ? "text-amber-500" : tone === "danger" ? "text-rose-500" : "text-foreground";
  return (
    <div className="rounded-md border border-border/60 p-4">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-medium ${color}`}>{value}</div>
    </div>
  );
}

function PostRow({ post, busy, onRegen }: { post: any; busy: boolean; onRegen: (id: string, customUrl?: string) => void }) {
  const [custom, setCustom] = useState("");
  const internal = post.hero_image?.includes("/storage/v1/object/public/blog-assets/");
  const status = !post.hero_image ? "missing" : internal ? "internal" : "external";
  const tone = status === "missing" ? "bg-rose-500/10 text-rose-500" : status === "external" ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600";
  return (
    <div className="grid grid-cols-[80px_1fr_auto] gap-4 items-center px-4 py-3 border-b border-border/50 last:border-0">
      <div className="aspect-[16/10] rounded bg-muted/30 overflow-hidden">
        {post.hero_image && <img src={post.hero_image} alt="" className="w-full h-full object-cover" loading="lazy" />}
      </div>
      <div className="min-w-0">
        <div className="text-sm truncate">{post.title}</div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
          <span className={`px-1.5 py-px rounded ${tone}`}>{status}</span>
          <span>·</span>
          <span>{post.status}</span>
          <span>·</span>
          <span className="truncate">{post.slug}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Custom URL…" className="h-8 w-48 text-xs" />
        <Button size="sm" variant="outline" disabled={busy || !custom} onClick={() => onRegen(post.id, custom)}>Use URL</Button>
        <Button size="sm" disabled={busy} onClick={() => onRegen(post.id)}>Regenerate</Button>
      </div>
    </div>
  );
}