// Phase 8F.3 — Platform Boundary Enforcement
//
// Single source of truth mapping table_name → authoritative DB ref.
// Used by the admin Boundary Map panel AND consulted by the primary-guard
// to detect router mismatches (a write hitting the wrong DB).
//
// IMPORTANT: this is the **runtime contract**. Any new table MUST be added
// here when it is created on a sibling DB, otherwise the boundary panel will
// flag it as "unowned" and the CI assertion will fail.

export type DbAuthority =
  | "primary"
  | "admin"
  | "blogs"
  | "api_ai"
  | "realtime"
  | "workspace"
  | "owned";

export const DB_REFS: Record<DbAuthority, string> = {
  primary: "vbnqaovxatucrgtnggea",
  admin: "rqqiujmiagauzohdqjmi",
  blogs: "ynvfxxmhowlvhtqiigfc",
  api_ai: "larncwugkdclkhayfjle",
  realtime: "qeswhaytgvosfzzgraef",
  workspace: "utflzmecghdtcjupgdan",
  owned: "wguuipsikboqqinqeehv",
};

export const DB_LABEL: Record<DbAuthority, string> = {
  primary: "Primary (Auth/Billing Kernel)",
  admin: "Admin / Ops Control Plane",
  blogs: "Blogs / SEO / Newsletters",
  api_ai: "API · AI · Async · Queues",
  realtime: "Realtime / Event Fabric",
  workspace: "Workspace / Client Hub",
  owned: "Owned Ops (telemetry mirror)",
};

/** Authoritative table → DB mapping. Keep alphabetical within each group. */
export const TABLE_AUTHORITY: Record<string, DbAuthority> = {
  // ── PRIMARY — auth + billing kernel only ───────────────────────────────
  profiles: "primary",
  subscriptions: "primary",
  wallets: "primary",
  payments: "primary",
  dodo_subscriptions: "primary",
  dodo_webhook_events: "primary",
  tier_limits: "primary",
  email_verifications: "primary",
  notification_events: "primary",
  user_roles: "primary",

  // ── ADMIN — control plane + telemetry ──────────────────────────────────
  admin_alerts: "admin",
  api_provider_health: "admin",
  runtime_extraction_streams: "admin",
  runtime_metrics: "admin",
  runtime_projections: "admin",
  runtime_direct_write_violations: "admin",
  db_extraction_scores: "admin",
  db_heatmap_snapshots: "admin",
  intelligence_alerts: "admin",
  docs_pages: "admin",

  // ── BLOGS — content / SEO / newsletters ────────────────────────────────
  blog_posts: "blogs",
  blog_events: "blogs",
  blog_categories: "blogs",
  seo_pages: "blogs",
  seo_topics: "blogs",
  seo_authors: "blogs",
  seo_blog_posts: "blogs",
  seo_redirects: "blogs",
  side_hustles: "blogs",
  hustle_votes: "blogs",
  newsletter_subscribers: "blogs",
  newsletter_issues: "blogs",
  newsletter_sends: "blogs",
  newsletter_schedules: "blogs",
  newsletter_capture_dismissals: "blogs",
  email_logs: "blogs",
  email_templates: "blogs",

  // ── API/AI — runtime + queues + chat memory ───────────────────────────
  chat_messages: "api_ai",
  ai_conversation_memory: "api_ai",
  ai_context_windows: "api_ai",
  ai_session_state: "api_ai",
  ai_jobs: "api_ai",
  workflow_runs: "api_ai",
  workflow_events: "api_ai",
  event_log: "api_ai",
  event_failures: "api_ai",
  usage_ledger: "api_ai",

  // ── REALTIME — websocket fabric + social/live ─────────────────────────
  forum_posts: "realtime",
  forum_replies: "realtime",
  forum_votes: "realtime",
  forum_reports: "realtime",
  community_groups: "realtime",
  community_memberships: "realtime",
  community_onboarding: "realtime",
  category_requests: "realtime",
  discord_links: "realtime",
  realtime_events: "realtime",
  websocket_presence: "realtime",
  live_sessions: "realtime",
  collaboration_state: "realtime",
  event_fanout_queue: "realtime",

  // ── WORKSPACE — client hub / intake / freelancer OS ───────────────────
  workspaces: "workspace",
  workspace_members: "workspace",
  workspace_projects: "workspace",
  workspace_assets: "workspace",
  intake_forms: "workspace",
  intake_submissions: "workspace",
  client_records: "workspace",
};

export function authorityFor(table: string): DbAuthority | "unowned" {
  return TABLE_AUTHORITY[table] ?? "unowned";
}

/** Reverse index — tables grouped by authoritative DB. */
export function tablesByAuthority(): Record<DbAuthority, string[]> {
  const out: Record<DbAuthority, string[]> = {
    primary: [], admin: [], blogs: [], api_ai: [],
    realtime: [], workspace: [], owned: [],
  };
  for (const [t, db] of Object.entries(TABLE_AUTHORITY)) out[db].push(t);
  for (const k of Object.keys(out) as DbAuthority[]) out[k].sort();
  return out;
}