/**
 * Phase 9.3 — Docs Ops panel.
 * Surfaces docs_categories / docs_pages health, edge cache freshness, and
 * a starter fallback when content tables are empty.
 */
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText } from "lucide-react";
import { failOpen } from "@/lib/async/timeout";
import { TimedSection, DegradedCard } from "@/components/runtime/Loaders";
import { docsDb } from "@/integrations/docs/client";

type Counts = { categories: number; pages: number; lastUpdated: string | null };

export default function DocsOpsPanel() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<{ ok: boolean; ageMs?: number; status?: number } | null>(null);

  async function load() {
    setLoading(true); setError(null);
    const out = await failOpen(
      async () => {
        const [cats, pages] = await Promise.all([
          (docsDb as any).from("docs_categories").select("id", { count: "exact", head: true }),
          (docsDb as any).from("docs_pages").select("id, updated_at", { count: "exact" }).order("updated_at", { ascending: false }).limit(1),
        ]);
        return {
          categories: cats?.count ?? 0,
          pages: pages?.count ?? 0,
          lastUpdated: pages?.data?.[0]?.updated_at ?? null,
        } as Counts;
      },
      null,
      "admin.docs_ops.counts",
      { timeoutMs: 4_000, retries: 0 },
    );
    if (!out) setError("Docs DB unreachable.");
    setCounts(out);

    // Edge cache probe.
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/docs-read-public?probe=1`;
    const probed = await failOpen(
      async () => {
        const start = performance.now();
        const r = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "" } });
        return { ok: r.ok, status: r.status, ageMs: performance.now() - start };
      },
      { ok: false, status: 0 },
      "admin.docs_ops.edge",
      { timeoutMs: 3_000, retries: 0 },
    );
    setCache(probed);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <h2 className="font-medium">Docs Operations</h2>
        </div>
        <Button size="sm" variant="ghost" onClick={load}>
          <RefreshCw className="h-3 w-3 mr-1" /> Refresh
        </Button>
      </div>

      <TimedSection loading={loading} error={error} title="Docs content" onRetry={load}>
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Categories</div>
            <div className="text-2xl font-semibold mt-1">{counts?.categories ?? 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Pages</div>
            <div className="text-2xl font-semibold mt-1">{counts?.pages ?? 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Last updated</div>
            <div className="text-sm font-medium mt-2">
              {counts?.lastUpdated ? new Date(counts.lastUpdated).toLocaleString() : "—"}
            </div>
          </Card>
        </div>

        {counts && counts.pages === 0 && (
          <DegradedCard
            title="Docs index is empty"
            reason="No docs_pages rows. Run the docs bootstrap seed on the Admin DB to populate starter content."
          />
        )}

        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">docs-read-public edge function</div>
          {cache ? (
            <div className="flex items-center gap-3 text-sm">
              <Badge variant={cache.ok ? "default" : "destructive"}>{cache.ok ? "OK" : `FAIL ${cache.status ?? ""}`}</Badge>
              {cache.ageMs != null && <span className="text-muted-foreground">{cache.ageMs.toFixed(0)}ms</span>}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">not probed</span>
          )}
        </Card>
      </TimedSection>
    </div>
  );
}