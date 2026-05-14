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
  return safe(
    supabase.rpc("track_tool_launch" as any, {
      _tool_slug: a.toolSlug,
      _source_kind: a.sourceKind ?? "direct",
      _source_slug: a.sourceSlug ?? null,
      _cta_id: a.ctaId ?? null,
      _persona: a.persona ?? null,
      _anon_id: anonId(),
      _metadata: a.metadata ?? {},
    }),
  );
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
  return safe(
    supabase.rpc("track_cta_event" as any, {
      _cta_id: e.ctaId,
      _kind: e.kind,
      _source_slug: e.sourceSlug ?? null,
      _target_slug: e.targetSlug ?? null,
      _persona: e.persona ?? null,
      _anon_id: anonId(),
      _metadata: e.metadata ?? {},
    }),
  );
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
      supabase.from("blog_events" as any).insert({
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