/**
 * Phase 9.3 — Docs Ops panel.
 * Surfaces docs_categories / docs_pages health, edge cache freshness, and
 * a starter fallback when content tables are empty.
 */
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText, Hammer } from "lucide-react";
import { failOpen } from "@/lib/async/timeout";
import { TimedSection, DegradedCard } from "@/components/runtime/Loaders";
import { listDocsCategories, listDocsPages } from "@/integrations/docs/client";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Counts = { categories: number; pages: number; lastUpdated: string | null };

export default function DocsOpsPanel() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<{ ok: boolean; status: number; ageMs: number | null } | null>(null);
  const [rebuilding, setRebuilding] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    const out = await failOpen(
      async () => {
        const [cats, pages] = await Promise.all([listDocsCategories(), listDocsPages()]);
        const newest = pages
          .map((p) => p.updated_at)
          .filter(Boolean)
          .sort()
          .pop() ?? null;
        return { categories: cats.length, pages: pages.length, lastUpdated: newest } as Counts;
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
        const r = await fetch(url, {
          headers: { apikey: (import.meta.env as any).VITE_SUPABASE_PUBLISHABLE_KEY ?? "" },
        });
        return { ok: r.ok, status: r.status, ageMs: performance.now() - start };
      },
      { ok: false, status: 0, ageMs: null },
      "admin.docs_ops.edge",
      { timeoutMs: 3_000, retries: 0 },
    );
    setCache(probed);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function rebuild() {
    const token = window.prompt("Enter DOCS_REBUILD_TOKEN to reseed docs from canonical seed:");
    if (!token) return;
    setRebuilding(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/docs-rebuild`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rebuild-token": token,
          apikey: (import.meta.env as any).VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
          Authorization: `Bearer ${(import.meta.env as any).VITE_SUPABASE_PUBLISHABLE_KEY ?? ""}`,
        },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        toast.error(`Rebuild failed: ${body?.error ?? res.status}`);
      } else {
        toast.success(`Rebuilt: ${body?.report?.pages_upserted ?? 0} pages, ${body?.report?.published_pages_after ?? 0} published`);
        await load();
      }
    } catch (e: any) {
      toast.error(`Rebuild error: ${e?.message ?? String(e)}`);
    } finally {
      setRebuilding(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <h2 className="font-medium">Docs Operations</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={rebuild} disabled={rebuilding}>
            <Hammer className="h-3 w-3 mr-1" /> {rebuilding ? "Rebuilding…" : "Rebuild docs"}
          </Button>
          <Button size="sm" variant="ghost" onClick={load}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
        </div>
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