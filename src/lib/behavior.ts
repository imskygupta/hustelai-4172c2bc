import { blogDb } from "@/integrations/blog/db";
import { supabase } from "@/integrations/supabase/client";

/**
 * Behavior intelligence SDK.
 *
 * - Stable anon_id in localStorage (UUID) so anonymous events can be
 *   correlated across a session without auth.
 * - All track* helpers are fire-and-forget — analytics must never break UI.
 * - Bookmarks: auth-aware persistence via toggle_bookmark RPC + a local
 *   fallback set so guests can still "save" things and we can reconcile
 *   on signup (future work).
 *
 * Telemetry plane (Phase A): track* helpers now batch-route through the
 * `telemetry-router` edge function, which writes to the OWNED telemetry DB
 * (wguuipsikboqqinqeehv). On any router failure the SDK transparently falls
 * back to the legacy RPC path so dashboards keep working during cutover.
 * Toggle off by setting `localStorage.ha_telemetry_router = "off"`.
 */

const ANON_KEY = "ha_anon_id";
const LOCAL_BOOKMARKS_KEY = "ha_local_bookmarks";

export function anonId(): string {
  if (typeof window === "undefined") return "ssr";
  let v = localStorage.getItem(ANON_KEY);
  if (!v) {
    v = (crypto as any)?.randomUUID?.() ?? `anon_${Math.random().toString(36).slice(2)}`;
    try { localStorage.setItem(ANON_KEY, v); } catch { /* ignore */ }
  }
  return v;
}

function safe<T>(p: PromiseLike<T>): Promise<T | undefined> {
  return Promise.resolve(p).then((v) => v).catch(() => undefined);
}

/* ---------------- Telemetry router (batched, fire-and-forget) ---------------- */

type TelemetryEvent = {
  name: string;
  payload: Record<string, unknown>;
  anon_id?: string | null;
  user_id?: string | null;
  dedupe_key?: string | null;
  ts?: string;
};

const TELEMETRY_BUFFER: TelemetryEvent[] = [];
const TELEMETRY_BATCH_MS = 1500;
const TELEMETRY_MAX_BATCH = 25;
let telemetryTimer: ReturnType<typeof setTimeout> | null = null;

function telemetryEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem("ha_telemetry_router") !== "off"; }
  catch { return true; }
}

function scheduleFlush() {
  if (telemetryTimer) return;
  telemetryTimer = setTimeout(() => { telemetryTimer = null; void flushTelemetry(); }, TELEMETRY_BATCH_MS);
}

async function flushTelemetry() {
  if (TELEMETRY_BUFFER.length === 0) return;
  const batch = TELEMETRY_BUFFER.splice(0, TELEMETRY_MAX_BATCH);
  try {
    const { error } = await supabase.functions.invoke("telemetry-router", { body: { events: batch } });
    if (error) throw error;
  } catch {
    // Router unavailable → fall back to legacy RPCs so production never loses signal.
    for (const ev of batch) await legacyFallback(ev);
  }
  if (TELEMETRY_BUFFER.length > 0) scheduleFlush();
}

async function legacyFallback(ev: TelemetryEvent) {
  try {
    if (ev.name === "tool_launch") {
      await supabase.rpc("track_tool_launch" as any, {
        _tool_slug: ev.payload.tool_slug,
        _source_kind: ev.payload.source_kind ?? "direct",
        _source_slug: ev.payload.source_slug ?? null,
        _cta_id: ev.payload.cta_id ?? null,
        _persona: ev.payload.persona ?? null,
        _anon_id: ev.anon_id ?? null,
        _metadata: ev.payload.metadata ?? {},
      });
    } else if (ev.name === "cta_impression" || ev.name === "cta_click") {
      await supabase.rpc("track_cta_event" as any, {
        _cta_id: ev.payload.cta_id,
        _kind: ev.name === "cta_impression" ? "impression" : "click",
        _source_slug: ev.payload.source_slug ?? null,
        _target_slug: ev.payload.target_slug ?? null,
        _persona: ev.payload.persona ?? null,
        _anon_id: ev.anon_id ?? null,
        _metadata: ev.payload.metadata ?? {},
      });
    }
    // blog_event_* writes have no legacy client-side path; silently drop.
  } catch { /* ignore */ }
}

function enqueueTelemetry(ev: TelemetryEvent) {
  if (!telemetryEnabled()) { void legacyFallback(ev); return; }
  TELEMETRY_BUFFER.push({
    ...ev,
    anon_id: ev.anon_id ?? anonId(),
    ts: ev.ts ?? new Date().toISOString(),
  });
  if (TELEMETRY_BUFFER.length >= TELEMETRY_MAX_BATCH) {
    if (telemetryTimer) { clearTimeout(telemetryTimer); telemetryTimer = null; }
    void flushTelemetry();
  } else {
    scheduleFlush();
  }
}

// Flush on tab hide so we don't lose end-of-session events.
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushTelemetry();
  });
}

/* ---------------- Tool launches ---------------- */

export interface ToolLaunchAttribution {
  toolSlug: string;
  sourceKind?: "blog" | "cta" | "rail" | "homepage" | "persona_page" | "direct" | "saved";
  sourceSlug?: string | null;
  ctaId?: string | null;
  persona?: string | null;
  metadata?: Record<string, any>;
}

export function trackToolLaunch(a: ToolLaunchAttribution) {
  enqueueTelemetry({
    name: "tool_launch",
    payload: {
      tool_slug: a.toolSlug,
      source_kind: a.sourceKind ?? "direct",
      source_slug: a.sourceSlug ?? null,
      cta_id: a.ctaId ?? null,
      persona: a.persona ?? null,
      metadata: a.metadata ?? {},
    },
  });
  return Promise.resolve(undefined);
}

/* ---------------- CTA events ---------------- */

export interface CtaEvent {
  ctaId: string;
  kind: "impression" | "click";
  sourceSlug?: string | null;
  targetSlug?: string | null;
  persona?: string | null;
  metadata?: Record<string, any>;
}

export function trackCta(e: CtaEvent) {
  // CTA impressions are deduped server-side; provide a soft key.
  const dedupe = e.kind === "impression"
    ? `${e.ctaId}:${e.sourceSlug ?? ""}:${anonId()}`
    : null;
  enqueueTelemetry({
    name: e.kind === "impression" ? "cta_impression" : "cta_click",
    payload: {
      cta_id: e.ctaId,
      source_slug: e.sourceSlug ?? null,
      target_slug: e.targetSlug ?? null,
      persona: e.persona ?? null,
      metadata: e.metadata ?? {},
    },
    dedupe_key: dedupe,
  });
  return Promise.resolve(undefined);
}

/* ---------------- Bookmarks ---------------- */

function getLocalBookmarks(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LOCAL_BOOKMARKS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}
function setLocalBookmarks(set: Set<string>) {
  try { localStorage.setItem(LOCAL_BOOKMARKS_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

export function isLocallyBookmarked(slug: string) {
  return getLocalBookmarks().has(slug);
}

export async function toggleBookmark(slug: string): Promise<{ saved: boolean; count: number; localOnly: boolean }> {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session?.user) {
    // Guest: local-only fallback
    const set = getLocalBookmarks();
    const saved = !set.has(slug);
    if (saved) set.add(slug); else set.delete(slug);
    setLocalBookmarks(set);
    safe(
      blogDb.from("blog_events" as any).insert({
        post_slug: slug,
        anon_id: anonId(),
        kind: saved ? "bookmark_local" : "unbookmark_local",
      }),
    );
    const count = await fetchBookmarkCount(slug);
    return { saved, count, localOnly: true };
  }
  const { data, error } = await supabase.rpc("toggle_bookmark" as any, { _slug: slug });
  if (error) throw error;
  const res = (data ?? {}) as { saved: boolean; count: number };
  return { saved: !!res.saved, count: res.count ?? 0, localOnly: false };
}

export async function fetchBookmarkCount(slug: string): Promise<number> {
  const { data } = await supabase.rpc("bookmark_count_for_post" as any, { _slug: slug });
  return (data as number) ?? 0;
}

export async function fetchBookmarkCounts(slugs: string[]): Promise<Record<string, number>> {
  if (!slugs.length) return {};
  const { data } = await supabase.rpc("bookmark_counts_for_posts" as any, { _slugs: slugs });
  const out: Record<string, number> = {};
  for (const r of (data as any[]) ?? []) out[r.post_slug] = r.count;
  return out;
}

export async function fetchUserBookmarks(): Promise<string[]> {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session?.user) return [...getLocalBookmarks()];
  const { data } = await supabase.rpc("user_bookmarks" as any);
  const remote = ((data as any[]) ?? []).map((r) => r.post_slug as string);
  // Merge with local fallback so saved-page works during transition.
  return Array.from(new Set([...remote, ...getLocalBookmarks()]));
}

export async function isBookmarked(slug: string): Promise<boolean> {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session?.user) return getLocalBookmarks().has(slug);
  const { data } = await supabase
    .from("blog_bookmarks" as any)
    .select("id")
    .eq("post_slug", slug)
    .eq("user_id", sess.session.user.id)
    .maybeSingle();
  return !!data;
}

/* ---------------- Most-X helpers (homepage / rails) ---------------- */

export async function fetchMostLaunchedTools(limit = 6) {
  const { data } = await supabase.rpc("most_launched_tools" as any, { _limit: limit });
  return ((data as any[]) ?? []) as { tool_slug: string; launches: number }[];
}

export async function fetchMostSavedSlugs(limit = 6): Promise<string[]> {
  const { data } = await supabase.rpc("most_saved_posts" as any, { _limit: limit });
  return ((data as any[]) ?? []).map((r) => r.post_slug as string);
}

/* ---------------- Live activity / pulse ---------------- */

export interface OperatorPulse {
  views_today: number;
  reads_today: number;
  bookmarks_24h: number;
  launches_24h: number;
  distinct_7d: number;
  total_bookmarks: number;
  last_bookmark_at: string | null;
}

export async function fetchOperatorPulse(slug: string): Promise<OperatorPulse | null> {
  if (!slug) return null;
  const { data } = await supabase.rpc("operator_pulse" as any, { _slug: slug });
  return (data as OperatorPulse) ?? null;
}

export interface GlobalPulse {
  active_guides: number;
  launches_today: number;
  saves_today: number;
  views_today: number;
}

export async function fetchGlobalPulse(): Promise<GlobalPulse | null> {
  const { data } = await supabase.rpc("operator_pulse_global" as any);
  return (data as GlobalPulse) ?? null;
}

/* ---------------- Editorial conversion intelligence ---------------- */

export interface PostPerformance {
  views: number;
  reads: number;
  bookmarks: number;
  cta_impressions: number;
  cta_clicks: number;
  cta_ctr: number;
  tool_launches: number;
  conversion_pct: number;
  returning_pct: number;
  distinct_visitors: number;
  top_persona: string | null;
  engagement_score: number;
}

export async function fetchPostPerformance(slug: string): Promise<PostPerformance | null> {
  if (!slug) return null;
  const { data, error } = await supabase.rpc("post_performance" as any, { _slug: slug });
  if (error) return null;
  return (data as PostPerformance) ?? null;
}

/* ---------------- Recommendations ---------------- */

export async function fetchRecommendedToolsFromPost(slug: string, limit = 4) {
  const { data } = await supabase.rpc("recommend_next_tools" as any, { _slug: slug, _limit: limit });
  return ((data as any[]) ?? []) as { tool_slug: string; launches: number }[];
}