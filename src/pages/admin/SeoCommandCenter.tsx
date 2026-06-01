import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// Read-only aggregator over existing SEO infrastructure.
// No new tables, queues, or pipelines — every number on this page comes
// from a generator/endpoint the platform already owns:
//   - /functions/v1/sitemap        (main marketing host)
//   - /functions/v1/blog-sitemap   (blogs.hustlaiapp.in)
//   - /functions/v1/docs-sitemap   (docs.hustlaiapp.in)
//   - /functions/v1/seo-operations (per-post validation signals)
//
// See docs/seo-permanent-fix.md for the full architecture.

const FN_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

type DomainStat = {
  key: "main" | "blog" | "docs";
  label: string;
  host: string;
  fn: string;
  total: number | null;
  error?: string;
};

function countUrls(xml: string) {
  const m = xml.match(/<loc>/g);
  return m ? m.length : 0;
}

async function fetchSitemap(fn: string): Promise<{ total: number | null; error?: string }> {
  try {
    const r = await fetch(`${FN_BASE}/${fn}`, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
    if (!r.ok) return { total: null, error: `${r.status}` };
    const xml = await r.text();
    return { total: countUrls(xml) };
  } catch (e: any) {
    return { total: null, error: e?.message ?? "fetch failed" };
  }
}

export default function SeoCommandCenter() {
  const [domains, setDomains] = useState<DomainStat[]>([
    { key: "main", label: "Marketing", host: "hustlaiapp.in", fn: "sitemap", total: null },
    { key: "blog", label: "Blogs",     host: "blogs.hustlaiapp.in", fn: "blog-sitemap", total: null },
    { key: "docs", label: "Docs",      host: "docs.hustlaiapp.in",  fn: "docs-sitemap", total: null },
  ]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setLoading(true); setErr(null);
    try {
      const results = await Promise.all(domains.map((d) => fetchSitemap(d.fn)));
      setDomains((prev) => prev.map((d, i) => ({ ...d, ...results[i] })));

      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const r = await fetch(`${FN_BASE}/seo-operations?action=report`, {
        headers: { Authorization: `Bearer ${token ?? ""}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      if (r.ok) setReport(await r.json());
      else setReport(null);
    } catch (e: any) {
      setErr(e?.message ?? "refresh failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const totals = domains.reduce((a, d) => a + (d.total ?? 0), 0);
  const flagged = report?.summary?.flagged_total ?? report?.flagged?.length ?? 0;
  const issueBreakdown: Record<string, number> = report?.summary?.signals ?? {};

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">SEO Command Center</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Single index across marketing, blog, and docs. Numbers come from the live
              sitemaps and the existing <code className="text-xs">seo-operations</code> report —
              no parallel pipeline. See <code className="text-xs">docs/seo-permanent-fix.md</code>.
            </p>
          </div>
          <Button disabled={loading} onClick={refresh}>{loading ? "Refreshing…" : "Refresh"}</Button>
        </header>

        {err && <div className="rounded-md border border-destructive/40 text-destructive text-sm p-3">{err}</div>}

        {/* Global */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total URLs (all hosts)" value={totals} />
          <Stat label="Validation issues" value={flagged} tone={flagged > 0 ? "warn" : "ok"} />
          <Stat label="Hosts monitored" value={domains.length} />
          <Stat label="Pipelines reused" value="GSC + IndexNow" />
        </section>

        {/* Per domain */}
        <section className="grid md:grid-cols-3 gap-3">
          {domains.map((d) => (
            <div key={d.key} className="rounded-lg border border-border/60 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{d.label}</div>
                <a className="text-xs text-muted-foreground hover:underline" href={`https://${d.host}`} target="_blank" rel="noreferrer">{d.host}</a>
              </div>
              <div className="text-3xl font-bold">{d.total ?? "—"}</div>
              <div className="text-xs text-muted-foreground">
                {d.error ? `error: ${d.error}` : `URLs in /${d.fn}`}
              </div>
              <a className="text-xs underline text-muted-foreground" href={`${FN_BASE}/${d.fn}`} target="_blank" rel="noreferrer">View sitemap →</a>
            </div>
          ))}
        </section>

        {/* Validation signals */}
        <section className="rounded-lg border border-border/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Validation signals</h2>
            <span className="text-xs text-muted-foreground">from seo-operations</span>
          </div>
          {Object.keys(issueBreakdown).length === 0 ? (
            <div className="text-sm text-muted-foreground">No flagged signals (or report not loaded).</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(issueBreakdown)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .map(([sig, n]) => (
                  <div key={sig} className="rounded border border-border/40 p-2">
                    <div className="text-xs text-muted-foreground">{sig}</div>
                    <div className="text-lg font-semibold">{n as number}</div>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* Drill-down — links to existing operator screens */}
        <section className="rounded-lg border border-border/60 p-4">
          <h2 className="font-semibold mb-3">Drill into existing operator screens</h2>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            <NavLink to="/admin/blog/seo" label="Blog SEO health" desc="Per-post canonical, OG, schema, internal-link signals" />
            <NavLink to="/admin/blog/crawl" label="Crawl orchestrator" desc="Registry, retry queue, GSC + IndexNow throughput" />
            <NavLink to="/admin/blog/adsense" label="AdSense readiness" desc="Word count, FAQ, ad-safety per article" />
            <NavLink to="/admin/blog/os" label="Editorial OS" desc="Topic, linking, indexing pipeline view" />
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-emerald-600" : ""}`}>{value}</div>
    </div>
  );
}

function NavLink({ to, label, desc }: { to: string; label: string; desc: string }) {
  return (
    <Link to={to} className="block rounded border border-border/40 p-3 hover:bg-muted/40">
      <div className="font-medium">{label}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </Link>
  );
}