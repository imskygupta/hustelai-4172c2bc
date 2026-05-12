import { useEffect, useMemo, useState } from "react";
import { blogApi } from "@/integrations/blog/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

type Issue = { post_id: string; slug: string; title: string; severity: "error" | "warn" | "info"; kind: string; detail: string };
type Health = {
  summary: Record<string, any> & { external_hosts: { host: string; count: number }[] };
  issues: Issue[];
  helpers: {
    sitemap_url: string;
    sitemap_index_url?: string;
    robots_url?: string;
    sitemap_health?: { ok: boolean; reachable: boolean; status?: number; content_type?: string; article_count?: number; error?: string };
    ping_bing: string;
    gsc_submit: string;
    gsc_inspect: string;
  };
};

const KIND_LABELS: Record<string, string> = {
  meta_title: "Meta title",
  meta_description: "Meta description",
  hero_image: "Hero image",
  focus_keyword: "Focus keyword",
  category: "Category",
  noindex: "Noindex",
  internal_link: "Internal links",
  orphan: "Orphan page",
  image_alt: "Image alt",
  schema_article: "Article schema",
  schema_faq: "FAQ schema",
  duplicate_title: "Duplicate title",
  duplicate_description: "Duplicate description",
  low_content: "Low content",
};

export default function BlogSeoHealth() {
  const [data, setData] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");

  const reload = async () => {
    setLoading(true);
    try { setData(await blogApi.seoHealth()); }
    catch (e: any) { toast.error(String(e.message ?? e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  const grouped = useMemo(() => {
    if (!data) return new Map<string, Issue[]>();
    const filtered = data.issues.filter(i =>
      (filter === "all" || i.kind === filter) &&
      (severity === "all" || i.severity === severity)
    );
    const m = new Map<string, Issue[]>();
    for (const i of filtered) {
      const k = `${i.slug}::${i.title}`;
      m.set(k, [...(m.get(k) ?? []), i]);
    }
    return m;
  }, [data, filter, severity]);

  const kinds = useMemo(() => {
    const set = new Set<string>(); data?.issues.forEach(i => set.add(i.kind));
    return [...set];
  }, [data]);

  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast.success("Copied"); };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/60 px-6 h-14 flex items-center justify-between">
        <h1 className="font-medium">SEO health</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={reload} disabled={loading}>{loading ? "Scanning…" : "Re-scan"}</Button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-6xl">
        {/* Summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Tile label="Published" value={data?.summary.total_published} />
          <Tile label="Drafts" value={data?.summary.total_drafts} />
          <Tile label="Errors" value={data?.summary.errors} tone="error" />
          <Tile label="Warnings" value={data?.summary.warnings} tone="warn" />
          <Tile label="Orphans" value={data?.summary.orphans} tone="warn" />
          <Tile label="Duplicate titles" value={data?.summary.duplicate_titles} tone="warn" />
          <Tile label="Duplicate descs" value={data?.summary.duplicate_descriptions} />
          <Tile label="Missing meta" value={data?.summary.missing_meta} tone="error" />
          <Tile label="Low content" value={data?.summary.low_content} />
          <Tile label="Missing alt" value={data?.summary.missing_alt} />
          <Tile label="Noindex" value={data?.summary.noindex} />
          <Tile label="Total issues" value={data?.summary.total_issues} />
        </div>

        {/* Search Console helpers */}
        {data && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium text-sm">Crawl & indexing</div>
              {data.helpers.sitemap_health && (
                <Badge variant={data.helpers.sitemap_health.ok ? "secondary" : "destructive"} className="text-[11px]">
                  {data.helpers.sitemap_health.ok
                    ? `Sitemap healthy · ${data.helpers.sitemap_health.article_count ?? 0} URLs`
                    : data.helpers.sitemap_health.reachable
                      ? `Sitemap unhealthy · HTTP ${data.helpers.sitemap_health.status}`
                      : "Sitemap unreachable"}
                </Badge>
              )}
            </div>
            <div className="space-y-2 text-sm">
              {[
                { label: "Sitemap", value: data.helpers.sitemap_url },
                { label: "Sitemap index", value: data.helpers.sitemap_index_url },
                { label: "Robots", value: data.helpers.robots_url },
              ].filter(r => r.value).map(r => (
                <div key={r.label} className="flex items-center gap-2">
                  <span className="text-muted-foreground w-28 shrink-0 text-xs uppercase tracking-wide">{r.label}</span>
                  <code className="text-xs truncate flex-1 bg-muted/40 rounded px-2 py-1">{r.value}</code>
                  <Button size="sm" variant="ghost" onClick={() => copy(r.value!)}>Copy</Button>
                  <a href={r.value!} target="_blank" rel="noopener" className="text-xs underline text-muted-foreground hover:text-foreground">Open</a>
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm mt-4 pt-4 border-t border-border/40">
              <Button size="sm" variant="default" onClick={() => { copy(data.helpers.sitemap_url); window.open(data.helpers.gsc_submit, "_blank"); }}>
                Submit to Search Console
              </Button>
              <a className="text-sm underline self-center" href={data.helpers.gsc_inspect} target="_blank" rel="noopener">Inspect URLs in Search Console →</a>
              <a className="text-sm underline self-center" href={data.helpers.ping_bing} target="_blank" rel="noopener">Ping Bing sitemap →</a>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              Sitemaps are served from the verified <code>blogs.hustlaiapp.in</code> domain. The button above copies the public URL and opens Search Console — paste it into the “Add a new sitemap” field.
            </p>
          </Card>
        )}

        {/* External link map */}
        {data?.summary.external_hosts?.length > 0 && (
          <Card className="p-4">
            <div className="font-medium mb-2 text-sm">External link surface (top hosts)</div>
            <div className="flex flex-wrap gap-2">
              {data.summary.external_hosts.map(h => (
                <Badge key={h.host} variant="secondary" className="font-mono text-[11px]">{h.host} · {h.count}</Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs uppercase tracking-wide text-muted-foreground mr-2">Filter</span>
          <select value={severity} onChange={e => setSeverity(e.target.value)} className="text-sm bg-background border border-border rounded px-2 py-1">
            <option value="all">All severities</option>
            <option value="error">Errors</option>
            <option value="warn">Warnings</option>
            <option value="info">Info</option>
          </select>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="text-sm bg-background border border-border rounded px-2 py-1">
            <option value="all">All issue types</option>
            {kinds.map(k => <option key={k} value={k}>{KIND_LABELS[k] ?? k}</option>)}
          </select>
          <span className="text-xs text-muted-foreground">{[...grouped.values()].reduce((s, a) => s + a.length, 0)} issues</span>
        </div>

        {/* Issues grouped by post */}
        <div className="space-y-2">
          {[...grouped.entries()].map(([key, list]) => {
            const [slug, title] = key.split("::");
            return (
              <Card key={key} className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <a href={`https://blogs.hustlaiapp.in/${slug}`} target="_blank" rel="noopener" className="text-sm font-medium hover:underline truncate">{title}</a>
                  <a href={`/admin/blog?id=${list[0].post_id}`} className="text-[11px] text-muted-foreground hover:text-foreground">Open in editor →</a>
                </div>
                <ul className="space-y-1 text-sm">
                  {list.map((i, k) => (
                    <li key={k} className="flex items-start gap-2">
                      <SevDot s={i.severity} />
                      <span className="text-muted-foreground text-xs uppercase tracking-wide w-32 shrink-0">{KIND_LABELS[i.kind] ?? i.kind}</span>
                      <span className="flex-1">{i.detail}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
          {!loading && data && grouped.size === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">No issues match your filter. Editorial health is clean.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: any; tone?: "error" | "warn" }) {
  const colour = tone === "error" ? "text-destructive" : tone === "warn" ? "text-amber-500" : "text-foreground";
  return (
    <Card className="p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${colour}`}>{value ?? "—"}</div>
    </Card>
  );
}

function SevDot({ s }: { s: Issue["severity"] }) {
  const c = s === "error" ? "bg-destructive" : s === "warn" ? "bg-amber-500" : "bg-muted-foreground";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full mt-2 ${c}`} />;
}