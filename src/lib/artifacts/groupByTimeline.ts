import type { ArtifactRow } from "@/lib/artifacts/api";

export type TimelineBucket = "today" | "yesterday" | "this_week" | "earlier" | "archived";

export const BUCKET_LABELS: Record<TimelineBucket, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "Earlier this week",
  earlier: "Older",
  archived: "Archived",
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function bucketOf(iso: string, now: Date = new Date()): TimelineBucket {
  const t = new Date(iso);
  const today = startOfDay(now).getTime();
  const yest = today - 86_400_000;
  const weekStart = today - 6 * 86_400_000;
  const ts = t.getTime();
  if (ts >= today) return "today";
  if (ts >= yest) return "yesterday";
  if (ts >= weekStart) return "this_week";
  return "earlier";
}

export function groupByTimeline<T extends ArtifactRow>(rows: T[]): Array<{ bucket: TimelineBucket; label: string; items: T[] }> {
  const now = new Date();
  const groups: Record<TimelineBucket, T[]> = { today: [], yesterday: [], this_week: [], earlier: [], archived: [] };
  for (const r of rows) {
    const state = (r.artifact_state || "").toString();
    if (state === "archived" || r.status === "revoked") groups.archived.push(r);
    else groups[bucketOf(r.created_at, now)].push(r);
  }
  return (Object.keys(groups) as TimelineBucket[])
    .filter((k) => groups[k].length)
    .map((k) => ({ bucket: k, label: BUCKET_LABELS[k], items: groups[k] }));
}