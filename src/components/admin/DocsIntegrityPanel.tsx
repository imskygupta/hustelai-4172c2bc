/**
 * Docs Integrity dashboard — surfaces audit data from docs-read-public op=audit.
 * Read-only. Never blocks render. Falls back to "unknown" on failure.
 */
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { failOpen } from "@/lib/async/timeout";
import { TimedSection } from "@/components/runtime/Loaders";

type Snap = {
  categories: number;
  pages: number;
  published: number;
  unpublished_slugs: string[];
  orphaned_slugs: string[];
  empty_slugs: string[];
  duplicate_slugs: string[];
  last_updated: string | null;
  category_titles: { slug: string; title: string }[];
} | null;

type Audit = {
  admin_db: Snap;
  legacy_db: Snap;
  legacy_configured: boolean;
  active_source: "admin" | "legacy" | "none";
  checked_at: string;
};

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "warn" | "danger" | "ok" }) {
  const color = tone === "danger" ? "text-rose-500" : tone === "warn" ? "text-amber-500" : tone === "ok" ? "text-emerald-500" : "";
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${color}`}>{value}</div>
    </Card>
  );
}

function SnapCard({ title, snap }: { title: string; snap: Snap }) {
  if (!snap) {
    return (
      <Card className="p-4">
        <div className="font-medium mb-1">{title}</div>
        <div className="text-sm text-muted-foreground">Not configured or unreachable.</div>
      </Card>
    );
  }
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">{title}</div>
        <Badge variant={snap.pages > 0 ? "default" : "secondary"}>
          {snap.pages} pages
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="border rounded px-2 py-1.5 flex justify-between">
          <span className="text-muted-foreground">Categories</span><b>{snap.categories}</b>
        </div>
        <div className="border rounded px-2 py-1.5 flex justify-between">
          <span className="text-muted-foreground">Published</span><b>{snap.published}</b>
        </div>
        <div className="border rounded px-2 py-1.5 flex justify-between">
          <span className="text-muted-foreground">Orphaned</span>
          <b className={snap.orphaned_slugs.length ? "text-rose-500" : ""}>{snap.orphaned_slugs.length}</b>
        </div>
        <div className="border rounded px-2 py-1.5 flex justify-between">
          <span className="text-muted-foreground">Empty</span>
          <b className={snap.empty_slugs.length ? "text-amber-500" : ""}>{snap.empty_slugs.length}</b>
        </div>
        <div className="border rounded px-2 py-1.5 flex justify-between">
          <span className="text-muted-foreground">Duplicates</span>
          <b className={snap.duplicate_slugs.length ? "text-rose-500" : ""}>{snap.duplicate_slugs.length}</b>
        </div>
        <div className="border rounded px-2 py-1.5 flex justify-between">
          <span className="text-muted-foreground">Unpublished</span><b>{snap.unpublished_slugs.length}</b>
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground">
        Last updated: {snap.last_updated ? new Date(snap.last_updated).toLocaleString() : "—"}
      </div>
      {snap.orphaned_slugs.length > 0 && (
        <div className="text-xs">
          <div className="text-rose-500 font-medium mb-1">Orphaned slugs</div>
          <div className="font-mono text-[11px] break-all">{snap.orphaned_slugs.join(", ")}</div>
        </div>
      )}
      {snap.empty_slugs.length > 0 && (
        <div className="text-xs">
          <div className="text-amber-500 font-medium mb-1">Empty pages</div>
          <div className="font-mono text-[11px] break-all">{snap.empty_slugs.join(", ")}</div>
        </div>
      )}
    </Card>
  );
}

export default function DocsIntegrityPanel() {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    const out = await failOpen(
      async () => {
        const { data } = await supabase.functions.invoke("docs-read-public?op=audit", { method: "GET" });
        return ((data as any)?.data ?? null) as Audit | null;
      },
      null,
      "admin.docs_integrity.audit",
      { timeoutMs: 6_000, retries: 0 },
    );
    if (!out) setError("Docs audit unreachable.");
    setAudit(out);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const active = audit?.active_source ?? "none";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <h2 className="font-medium">Docs Integrity</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={active === "admin" ? "default" : active === "legacy" ? "secondary" : "destructive"}>
            source: {active}
          </Badge>
          <Button size="sm" variant="ghost" onClick={load}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <TimedSection loading={loading} error={error} title="Docs audit" onRetry={load}>
        {audit && (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <Stat label="Active source" value={active} tone={active === "none" ? "danger" : active === "legacy" ? "warn" : "ok"} />
              <Stat label="Admin pages" value={audit.admin_db?.pages ?? 0} tone={(audit.admin_db?.pages ?? 0) === 0 ? "danger" : "ok"} />
              <Stat label="Legacy pages" value={audit.legacy_db?.pages ?? (audit.legacy_configured ? 0 : "—")} />
              <Stat label="Last checked" value={new Date(audit.checked_at).toLocaleTimeString()} />
            </div>

            {active === "none" && (
              <Card className="p-4 border-rose-500/50 bg-rose-500/5">
                <div className="flex items-center gap-2 text-rose-500 font-medium mb-1">
                  <AlertTriangle className="h-4 w-4" /> No docs content found in any DB
                </div>
                <div className="text-sm text-muted-foreground">
                  Admin DB <code>docs_pages</code> and <code>docs_categories</code> are empty.
                  Legacy Docs DB is {audit.legacy_configured ? "configured but also empty" : "not configured"}.
                  See <code>mem/transfer/docs-content-recovery.md</code> for the recovery plan.
                </div>
              </Card>
            )}

            {active === "legacy" && (
              <Card className="p-4 border-amber-500/50 bg-amber-500/5">
                <div className="flex items-center gap-2 text-amber-600 font-medium mb-1">
                  <AlertTriangle className="h-4 w-4" /> Serving from legacy Docs DB
                </div>
                <div className="text-sm text-muted-foreground">
                  Admin DB docs tables are empty. The edge function is transparently
                  reading from the legacy Docs DB so /docs stays online. Run the
                  backfill in <code>mem/transfer/docs-content-recovery.md</code> to
                  cut over.
                </div>
              </Card>
            )}

            {active === "admin" && (
              <Card className="p-4 border-emerald-500/40 bg-emerald-500/5">
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <CheckCircle2 className="h-4 w-4" /> Admin DB is authoritative
                </div>
              </Card>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <SnapCard title="Admin DB (rqqiujmiagauzohdqjmi)" snap={audit.admin_db} />
              <SnapCard
                title={audit.legacy_configured ? "Legacy Docs DB (rnyllarpzgamrkvgcjbg)" : "Legacy Docs DB (not configured)"}
                snap={audit.legacy_db}
              />
            </div>
          </>
        )}
      </TimedSection>
    </div>
  );
}