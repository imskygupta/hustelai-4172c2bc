/**
 * Phase 9.3 — Shared runtime loader system.
 * Consistent skeletons, timeout/retry, and degraded fallbacks across all panels.
 */
import { ReactNode, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function PanelSkeleton({ rows = 4, label }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-2" aria-label={label ?? "loading"}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-muted/60 animate-pulse" style={{ width: `${60 + (i * 9) % 35}%` }} />
      ))}
    </div>
  );
}

export function DegradedCard({
  title,
  reason,
  onRetry,
  icon,
}: {
  title: string;
  reason?: string;
  onRetry?: () => void;
  icon?: ReactNode;
}) {
  return (
    <Card className="p-4 border-dashed border-amber-500/40 bg-amber-500/5">
      <div className="flex items-start gap-3">
        <div className="text-amber-500 mt-0.5">{icon ?? <AlertTriangle className="h-4 w-4" />}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{title} · degraded</div>
          {reason && <div className="text-xs text-muted-foreground mt-0.5">{reason}</div>}
        </div>
        {onRetry && (
          <Button size="sm" variant="ghost" onClick={onRetry}>
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        )}
      </div>
    </Card>
  );
}

export function OfflineCard({ title, onRetry }: { title: string; onRetry?: () => void }) {
  return <DegradedCard title={title} reason="Subsystem offline." onRetry={onRetry} icon={<WifiOff className="h-4 w-4" />} />;
}

/**
 * Wraps content with a 6s soft-timeout so we never spin forever.
 * After timeout, renders a degraded card while keeping the promise alive.
 */
export function TimedSection({
  loading,
  error,
  title,
  onRetry,
  children,
  timeoutMs = 6_000,
  skeletonRows = 4,
}: {
  loading: boolean;
  error?: string | null;
  title: string;
  onRetry?: () => void;
  children: ReactNode;
  timeoutMs?: number;
  skeletonRows?: number;
}) {
  const [softTimeout, setSoftTimeout] = useState(false);
  useEffect(() => {
    if (!loading) { setSoftTimeout(false); return; }
    const t = setTimeout(() => setSoftTimeout(true), timeoutMs);
    return () => clearTimeout(t);
  }, [loading, timeoutMs]);

  if (error) return <DegradedCard title={title} reason={error} onRetry={onRetry} />;
  if (loading && softTimeout) return <DegradedCard title={title} reason="Slow response — using cached/empty view." onRetry={onRetry} />;
  if (loading) return <PanelSkeleton rows={skeletonRows} label={title} />;
  return <>{children}</>;
}