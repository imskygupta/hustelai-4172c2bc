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
  const [intel, setIntel] = useState<any>(null);
  const [intelError, setIntelError] = useState<string | null>(null);
  const [intelLoading, setIntelLoading] = useState(true);
  const [pulse, setPulse] = useState(0);

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

  const loadIntel = async () => {
    setIntelLoading(true);
    try {
      const r = await blogApi.intelligence();
      if (r?.ok === false) { setIntelError(r.error || "intelligence unavailable"); setIntel(null); }
      else { setIntelError(null); setIntel(r); }
    } catch (e: any) {
      setIntelError(String(e?.message ?? e));
    } finally { setIntelLoading(false); }
  };

  useEffect(() => { reload(); loadIntel(); }, []);
  useEffect(() => {
    const t = setInterval(() => setPulse(p => (p + 1) % 1000), 2200);
    return () => clearInterval(t);
  }, []);

  const refreshTrends = async () => {
    try { await blogApi.refreshTrends(); toast.success("Refreshing trends…"); loadIntel(); }
    catch (e: any) { toast.error(String(e?.message ?? e)); }
  };

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

        {/* ───── Editorial Intelligence ───── */}
        <section className="rounded-md border border-border/60 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative inline-flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full bg-emerald-500/60 ${intelLoading ? "animate-ping" : pulse % 2 ? "opacity-60" : "opacity-100"}`} />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <h2 className="font-medium text-sm">Editorial intelligence</h2>
              <span className="text-[11px] text-muted-foreground">
                {intel?.summary ? `${intel.summary.published} published · ${intel.summary.in_pipeline} in pipeline · avg ${intel.summary.avg_score}/100` : "loading…"}
              </span>
            </div>
            <Button size="sm" variant="ghost" onClick={loadIntel} disabled={intelLoading}>{intelLoading ? "Refreshing…" : "Refresh"}</Button>
          </div>

          {intelError && (
            <div className="text-xs text-rose-500">Intelligence unavailable: {intelError}</div>
          )}

          {/* AI Draft Queue stages */}
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">AI draft queue</div>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
              {(intel?.stages ?? []).map((s: any) => (
                <div key={s.key} className="rounded border border-border/50 p-2">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span className={`h-1.5 w-1.5 rounded-full ${s.count ? "bg-emerald-500 animate-pulse" : "bg-muted"}`} />
                    {s.label}
                  </div>
                  <div className="text-lg font-medium mt-0.5">{s.count}</div>
                  {s.items[0] && (
                    <div className="text-[10px] text-muted-foreground truncate" title={s.items[0].title}>
                      {s.items[0].title}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Stage detail — most recent items per active stage */}
          {intel?.stages?.some((s: any) => s.count > 0) && (
            <div className="grid lg:grid-cols-2 gap-3">
              {intel.stages.filter((s: any) => s.count > 0).slice(0, 4).map((s: any) => (
                <div key={`d-${s.key}`} className="rounded border border-border/50 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">{s.label} · {s.count}</div>
                  <div className="space-y-1">
                    {s.items.map((it: any) => (
                      <div key={it.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate flex-1">{it.title}</span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {it.source} · {it.duration_ms ? `${Math.round(it.duration_ms / 60000)}m` : "—"} · {it.timestamp ? new Date(it.timestamp).toLocaleDateString() : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ───── Trending Topic Discovery ───── */}
        <section className="rounded-md border border-border/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm">Trending topic discovery</h2>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {intel?.trending?.cached ? "cached · refreshes every 6h" : "live"}
              </span>
              <Button size="sm" variant="outline" onClick={refreshTrends} disabled={intelLoading}>Refresh trends</Button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-2">
            {(intel?.trending?.items ?? []).map((t: any, i: number) => (
              <div key={i} className="rounded border border-border/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{t.keyword}</div>
                    <div className="text-[10px] text-muted-foreground mt-1 flex flex-wrap gap-1.5">
                      <Tag>{t.intent}</Tag>
                      <Tag tone={t.difficulty === "low" ? "success" : t.difficulty === "high" ? "warn" : undefined}>{t.difficulty} difficulty</Tag>
                      <Tag tone={t.freshness === "rising" ? "success" : undefined}>{t.freshness}</Tag>
                      <Tag>{t.cluster}</Tag>
                      <Tag>{t.source?.replace("_", " ")}</Tag>
                    </div>
                  </div>
                </div>
                {t.recommended_cta && (
                  <div className="text-[11px] text-muted-foreground mt-2 italic truncate">→ {t.recommended_cta}</div>
                )}
              </div>
            ))}
            {!intel?.trending?.items?.length && !intelLoading && (
              <div className="text-xs text-muted-foreground p-3">No trends yet — click Refresh trends.</div>
            )}
          </div>
        </section>

        {/* ───── Cluster Health ───── */}
        <section>
          <h2 className="font-medium text-sm mb-3">Topical cluster health</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(intel?.clusters ?? []).map((c: any) => (
              <div key={c.key} className="rounded border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{c.title}</div>
                  <div className="text-[10px] text-muted-foreground">{c.article_count} posts</div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-2">
                  <Mini label="Indexed" value={c.indexed_count} />
                  <Mini label="Internal links" value={c.internal_links} />
                  <Mini label="Avg SEO" value={`${c.avg_seo_score}/100`} tone={c.avg_seo_score >= 70 ? "success" : c.avg_seo_score < 50 ? "warn" : undefined} />
                  <Mini label="Orphan pages" value={c.orphan_pages} tone={c.orphan_pages > 0 ? "warn" : "success"} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ───── Internal linking engine ───── */}
        <section className="rounded-md border border-border/60 p-4">
          <h2 className="font-medium text-sm mb-3">Internal linking suggestions</h2>
          <div className="space-y-2">
            {(intel?.link_suggestions ?? []).slice(0, 12).map((s: any) => (
              <div key={s.id} className="text-xs">
                <div className="text-foreground truncate">{s.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-1.5">
                  {s.suggestions.map((t: any) => (
                    <span key={t.id} className="rounded border border-border/50 px-1.5 py-0.5">→ {t.title} <span className="opacity-60">({Math.round(t.score * 100)}%)</span></span>
                  ))}
                </div>
              </div>
            ))}
            {!intel?.link_suggestions?.length && !intelLoading && (
              <div className="text-xs text-muted-foreground">No new linking opportunities — well connected.</div>
            )}
          </div>
        </section>

        {/* ───── Quality scoring ───── */}
        <section>
          <h2 className="font-medium text-sm mb-3">Content quality (lowest first)</h2>
          <div className="border border-border/60 rounded overflow-hidden text-xs">
            <div className="grid grid-cols-[1fr_60px_60px_60px_60px_60px_60px_60px] gap-2 px-3 py-2 bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
              <div>Article</div>
              <div className="text-right">Total</div>
              <div className="text-right">Read</div>
              <div className="text-right">Depth</div>
              <div className="text-right">Stuff</div>
              <div className="text-right">Heads</div>
              <div className="text-right">Links</div>
              <div className="text-right">CTA</div>
            </div>
            {(intel?.quality ?? []).slice(0, 12).map((q: any) => (
              <div key={q.id} className="grid grid-cols-[1fr_60px_60px_60px_60px_60px_60px_60px] gap-2 px-3 py-2 border-t border-border/50">
                <div className="truncate">{q.title}</div>
                <div className={`text-right ${q.score.total >= 75 ? "text-emerald-500" : q.score.total < 55 ? "text-rose-500" : "text-amber-500"}`}>{q.score.total}</div>
                <div className="text-right text-muted-foreground">{q.score.readability}</div>
                <div className="text-right text-muted-foreground">{q.score.depth}</div>
                <div className="text-right text-muted-foreground">{q.score.stuffing}</div>
                <div className="text-right text-muted-foreground">{q.score.headings}</div>
                <div className="text-right text-muted-foreground">{q.score.internal_links}</div>
                <div className="text-right text-muted-foreground">{q.score.cta}</div>
              </div>
            ))}
            {!intel?.quality?.length && !intelLoading && (
              <div className="px-3 py-4 text-muted-foreground">No published posts yet.</div>
            )}
          </div>
        </section>

        {/* ───── Editorial calendar ───── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm">Editorial calendar</h2>
            <span className="text-[11px] text-muted-foreground">
              India prime window · {intel?.calendar?.suggested_window_ist?.start ?? "09:00"}–{intel?.calendar?.suggested_window_ist?.end ?? "12:00"} IST
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px]">
            {(intel?.calendar?.days ?? []).map((d: any) => {
              const today = new Date().toISOString().slice(0, 10);
              const isToday = d.date === today;
              const total = d.published.length + d.scheduled.length;
              return (
                <div key={d.date}
                  className={`rounded border p-1.5 min-h-[64px] ${isToday ? "border-foreground/60 bg-muted/30" : "border-border/50"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{d.date.slice(5)}</span>
                    {total > 0 && <span className="bg-emerald-500/15 text-emerald-600 rounded px-1">{total}</span>}
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {d.published.slice(0, 2).map((p: any) => (
                      <div key={p.id} className="truncate text-[9px] text-foreground/80" title={p.title}>● {p.title}</div>
                    ))}
                    {d.scheduled.slice(0, 2).map((p: any) => (
                      <div key={p.id} className="truncate text-[9px] text-muted-foreground italic" title={p.title}>○ {p.title}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

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

function Tag({ children, tone }: { children: any; tone?: "success" | "warn" | "danger" }) {
  const c = tone === "success" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
         : tone === "warn"    ? "bg-amber-500/10  text-amber-600  border-amber-500/30"
         : tone === "danger"  ? "bg-rose-500/10   text-rose-500   border-rose-500/30"
         :                       "border-border/60 text-muted-foreground";
  return <span className={`rounded border px-1.5 py-0.5 ${c}`}>{children}</span>;
}

function Mini({ label, value, tone }: { label: string; value: any; tone?: "success" | "warn" }) {
  const c = tone === "success" ? "text-emerald-500" : tone === "warn" ? "text-amber-500" : "text-foreground";
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={c}>{String(value)}</span>
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