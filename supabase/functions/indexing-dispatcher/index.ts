// Indexing Dispatcher — single fan-out invoked after every blog publish
// (auto via blog-scheduler, manual via blog-admin) and as a retry worker.
//
// Pipeline per slug (best-effort, never blocks publish):
//   1. blog-link-engine auto_insert (internal linking)
//   2. indexnow enqueue + flush                   (Bing + Yandex)
//   3. GSC sitemap submit + URL inspection        (via Lovable connector)
//   4. crawl-orchestrator refresh + sitemap ping  (registry + freshness)
//   5. blog-seo-health validate_url               (crawlability audit)
//
// GSC degrades to "pending_auth" if the google_search_console connector
// is not connected — IndexNow / sitemap / link / validate steps still run.
//
// Storage (BLOG DB): public.indexing_jobs, public.indexing_audit.
// Run bootstrap_sql action once in BLOG SQL editor before first use.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPA = Deno.env.get("SUPABASE_URL")!;
const SVC  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const primary = createClient(SUPA, ANON);
const primarySvc = () => createClient(SUPA, SVC);

const blog = createClient(
  Deno.env.get("BLOG_SUPABASE_URL")!,
  Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!,
);

const BLOG_HOST = "blogs.hustlaiapp.in";
const SITEMAP   = `https://${BLOG_HOST}/sitemap.xml`;
const SITE      = `https://${BLOG_HOST}/`;

// GSC — self-managed Google OAuth (refresh-token flow).
// Replaces the Lovable connector. Same pending_auth state machine.
const GSC_CLIENT_ID     = Deno.env.get("GSC_OAUTH_CLIENT_ID");
const GSC_CLIENT_SECRET = Deno.env.get("GSC_OAUTH_CLIENT_SECRET");
const GSC_REFRESH_TOKEN = Deno.env.get("GSC_OAUTH_REFRESH_TOKEN");
const GSC_BASE          = "https://www.googleapis.com";
const GSC_TOKEN_URL     = "https://oauth2.googleapis.com/token";

// In-memory access token cache (per cold start).
let _gscToken: { access_token: string; expires_at: number } | null = null;

async function getGoogleAccessToken(): Promise<string | null> {
  if (!GSC_CLIENT_ID || !GSC_CLIENT_SECRET || !GSC_REFRESH_TOKEN) return null;
  const now = Date.now();
  if (_gscToken && _gscToken.expires_at - 60_000 > now) return _gscToken.access_token;
  const body = new URLSearchParams({
    client_id: GSC_CLIENT_ID,
    client_secret: GSC_CLIENT_SECRET,
    refresh_token: GSC_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });
  const r = await safeFetch(GSC_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  }, 10000);
  const tok = (r.body as any)?.access_token;
  const ttl = Number((r.body as any)?.expires_in ?? 3600);
  if (!r.ok || !tok) { _gscToken = null; return null; }
  _gscToken = { access_token: tok, expires_at: now + ttl * 1000 };
  return tok;
}

// Retry policy: exponential backoff with cooldown caps.
// attempt → minutes until next retry.
const BACKOFF_MIN = [5, 15, 45, 120, 360]; // 5m, 15m, 45m, 2h, 6h, then stop
const MAX_ATTEMPTS = BACKOFF_MIN.length;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "content-type": "application/json" },
  });
}

async function isAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.replace("Bearer ", "");
  if (token === SVC) return true;
  const { data } = await primary.auth.getUser(token);
  if (!data?.user?.id) return false;
  const { data: r } = await primarySvc().from("user_roles")
    .select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  return !!r;
}

const BOOTSTRAP_SQL = `
-- Indexing Dispatcher schema. Run once in BLOG SQL editor.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.indexing_jobs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  url text not null,
  reason text not null default 'auto',                 -- auto|manual|refresh|retry
  state text not null default 'pending',               -- pending|in_flight|done|failed|pending_auth
  attempts int not null default 0,
  next_retry_at timestamptz,
  steps jsonb not null default '{}'::jsonb,            -- per-provider statuses
  providers jsonb not null default '{}'::jsonb,        -- {indexnow:ok, gsc:pending_auth, ...}
  payload jsonb default '{}'::jsonb,
  error text,
  submitted_at timestamptz,
  indexed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists indexing_jobs_state_idx on public.indexing_jobs(state, next_retry_at);
create index if not exists indexing_jobs_slug_idx  on public.indexing_jobs(slug);
create index if not exists indexing_jobs_created_idx on public.indexing_jobs(created_at desc);
-- One active job per URL: avoid duplicate fan-outs.
create unique index if not exists indexing_jobs_active_uniq
  on public.indexing_jobs(url) where state in ('pending','in_flight','pending_auth');

create table if not exists public.indexing_audit (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  ok boolean,
  http_status int,
  canonical text,
  noindex boolean,
  has_og boolean,
  has_jsonld boolean,
  has_article_schema boolean,
  in_sitemap boolean,
  issues jsonb default '[]'::jsonb,
  checked_at timestamptz default now()
);
create index if not exists indexing_audit_url_idx on public.indexing_audit(url, checked_at desc);

-- Retry worker: every 15 minutes, drains failed / pending_auth jobs whose
-- next_retry_at <= now(). Keep this single cron — no other indexing crons.
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'indexing-dispatcher-retry') then
    perform cron.schedule(
      'indexing-dispatcher-retry',
      '*/15 * * * *',
      $cron$
      select net.http_post(
        url := 'SUPA_URL_PLACEHOLDER/functions/v1/indexing-dispatcher?action=retry',
        headers := '{"Content-Type":"application/json","Authorization":"Bearer SVC_PLACEHOLDER"}'::jsonb,
        body := '{"limit":25}'::jsonb
      );
      $cron$
    );
  end if;
end$$;
`;

function bootstrap() {
  // Inject SUPA_URL / SVC at view time so the admin can copy-paste once.
  const sql = BOOTSTRAP_SQL
    .replaceAll("SUPA_URL_PLACEHOLDER", SUPA)
    .replaceAll("SVC_PLACEHOLDER", SVC);
  return json({ ok: true, sql });
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider calls — each returns { ok, detail } and NEVER throws.
// ─────────────────────────────────────────────────────────────────────────────
async function safeFetch(url: string, init?: RequestInit, timeoutMs = 12000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal });
    const text = await r.text().catch(() => "");
    let body: any = text;
    try { body = JSON.parse(text); } catch { /* keep text */ }
    return { ok: r.ok, status: r.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: String(e) };
  } finally { clearTimeout(t); }
}

async function stepLinkEngine(slug: string) {
  const r = await safeFetch(
    `${SUPA}/functions/v1/blog-link-engine?action=auto_insert_slug`,
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SVC}` },
      body: JSON.stringify({ slug }),
    },
  );
  // auto_insert_slug may not exist in older link-engine; treat 404 as soft-skip.
  if (r.status === 404) return { ok: true, skipped: "not_implemented" };
  return { ok: r.ok, status: r.status, detail: typeof r.body === "object" ? r.body : { raw: String(r.body).slice(0, 200) } };
}

async function stepIndexNow(url: string, slug: string, source_id: string) {
  const enq = await safeFetch(
    `${SUPA}/functions/v1/indexnow?action=enqueue`,
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SVC}` },
      body: JSON.stringify({ urls: [url], source_kind: "blog_post", source_id }),
    },
  );
  const flush = await safeFetch(
    `${SUPA}/functions/v1/indexnow?action=flush`,
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SVC}` },
      body: "{}",
    },
  );
  return { ok: enq.ok && flush.ok, enqueue: enq.status, flush: flush.status };
}

async function stepGsc(url: string) {
  // If self-managed OAuth not configured, return pending_auth — caller sets job state.
  if (!GSC_CLIENT_ID || !GSC_CLIENT_SECRET || !GSC_REFRESH_TOKEN) {
    return { ok: false, pending_auth: true, reason: "gsc_oauth_not_configured" };
  }
  const access = await getGoogleAccessToken();
  if (!access) {
    return { ok: false, pending_auth: true, reason: "gsc_token_refresh_failed" };
  }
  const headers = {
    "Authorization": `Bearer ${access}`,
    "content-type": "application/json",
  };
  // 1. (Re)submit sitemap — idempotent + free.
  const encSite = encodeURIComponent(SITE);
  const encMap  = encodeURIComponent(SITEMAP);
  const submit = await safeFetch(
    `${GSC_BASE}/webmasters/v3/sites/${encSite}/sitemaps/${encMap}`,
    { method: "PUT", headers },
  );
  // 2. URL inspection (optional; 2k/day quota — best-effort).
  const inspect = await safeFetch(
    `${GSC_BASE}/v1/urlInspection/index:inspect`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE }),
    },
  );
  // Treat 401/403 as auth failure → caller marks pending_auth and retries later.
  if (submit.status === 401 || submit.status === 403) {
    _gscToken = null; // invalidate cache so next attempt re-refreshes
    return { ok: false, pending_auth: true, reason: "gsc_unauthorized", submit_status: submit.status };
  }
  return {
    ok: submit.ok,
    submit_status: submit.status,
    inspect_status: inspect.status,
    coverage: (inspect.body as any)?.inspectionResult?.indexStatusResult?.coverageState ?? null,
  };
}

async function stepCrawlOrchRefresh(slug: string) {
  const r = await safeFetch(
    `${SUPA}/functions/v1/crawl-orchestrator?action=refresh_post`,
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SVC}` },
      body: JSON.stringify({ slug }),
    },
  );
  return { ok: r.ok, status: r.status };
}

async function stepValidate(url: string) {
  const r = await safeFetch(
    `${SUPA}/functions/v1/blog-seo-health?action=validate_url&url=${encodeURIComponent(url)}`,
    { method: "GET", headers: { authorization: `Bearer ${SVC}` } },
  );
  return { ok: r.ok, status: r.status, detail: r.body };
}

// ─────────────────────────────────────────────────────────────────────────────
// Job lifecycle helpers
// ─────────────────────────────────────────────────────────────────────────────
function nextRetryAt(attempt: number): string | null {
  const idx = Math.min(attempt, BACKOFF_MIN.length - 1);
  const mins = BACKOFF_MIN[idx];
  return new Date(Date.now() + mins * 60_000).toISOString();
}

async function upsertJob(slug: string, url: string, reason: string) {
  // Insert if no active job; otherwise re-arm existing pending row.
  const { data: existing } = await blog.from("indexing_jobs")
    .select("id,state,attempts")
    .eq("url", url)
    .in("state", ["pending", "in_flight", "pending_auth", "failed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    await blog.from("indexing_jobs").update({
      state: "pending", next_retry_at: null, reason,
      updated_at: new Date().toISOString(),
    }).eq("id", (existing as any).id);
    return (existing as any).id as string;
  }
  const { data: created, error } = await blog.from("indexing_jobs").insert({
    slug, url, reason, state: "pending",
  }).select("id").maybeSingle();
  if (error) throw new Error(`upsert_job: ${error.message}`);
  return (created as any).id as string;
}

async function runJob(jobId: string) {
  const { data: job } = await blog.from("indexing_jobs").select("*").eq("id", jobId).maybeSingle();
  if (!job) return { ok: false, error: "job_not_found" };

  const slug = (job as any).slug as string;
  const url  = (job as any).url as string;
  const attempts = ((job as any).attempts ?? 0) + 1;

  await blog.from("indexing_jobs").update({
    state: "in_flight", attempts, updated_at: new Date().toISOString(),
  }).eq("id", jobId);

  // Run all five steps in parallel (Promise.allSettled — never throws).
  const [link, indexnow, gsc, crawl, validate] = await Promise.allSettled([
    stepLinkEngine(slug),
    stepIndexNow(url, slug, (job as any).slug ?? ""),
    stepGsc(url),
    stepCrawlOrchRefresh(slug),
    stepValidate(url),
  ]);

  const unwrap = (s: PromiseSettledResult<any>) =>
    s.status === "fulfilled" ? s.value : { ok: false, error: String(s.reason).slice(0, 200) };

  const steps = {
    link: unwrap(link),
    indexnow: unwrap(indexnow),
    gsc: unwrap(gsc),
    crawl: unwrap(crawl),
    validate: unwrap(validate),
  };

  const providers = {
    link:     steps.link.ok ? "ok" : "fail",
    indexnow: steps.indexnow.ok ? "ok" : "fail",
    gsc:      steps.gsc.ok ? "ok" : (steps.gsc.pending_auth ? "pending_auth" : "fail"),
    crawl:    steps.crawl.ok ? "ok" : "fail",
    validate: steps.validate.ok ? "ok" : "fail",
  };

  // State decision:
  // - GSC pending_auth + all other steps ok → state=pending_auth, retry later.
  // - Indexnow + sitemap + validate all ok → done (even if GSC failed).
  // - Otherwise → failed with retry if under cap.
  const coreOk = steps.indexnow.ok && steps.crawl.ok && steps.validate.ok;
  let state: string;
  let next: string | null = null;

  if (providers.gsc === "pending_auth" && coreOk) {
    state = "pending_auth";
    next  = nextRetryAt(attempts);
  } else if (coreOk && steps.gsc.ok) {
    state = "done";
  } else if (coreOk) {
    // Core OK but GSC truly failed (not auth) → still done; retry only auth path.
    state = "done";
  } else if (attempts >= MAX_ATTEMPTS) {
    state = "failed";
  } else {
    state = "failed";
    next  = nextRetryAt(attempts);
  }

  await blog.from("indexing_jobs").update({
    state,
    steps,
    providers,
    next_retry_at: next,
    submitted_at: new Date().toISOString(),
    error: state === "failed" ? `core_failed_attempt_${attempts}` : null,
    updated_at: new Date().toISOString(),
  }).eq("id", jobId);

  return { ok: state === "done" || state === "pending_auth", state, providers };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entrypoints
// ─────────────────────────────────────────────────────────────────────────────
async function dispatch(slugs: string[], reason = "auto") {
  const cleaned = [...new Set(slugs.filter(s => /^[a-z0-9][a-z0-9-]+$/i.test(s)))].slice(0, 25);
  if (!cleaned.length) return { ok: true, dispatched: 0 };
  const jobs: { jobId: string; slug: string }[] = [];
  for (const slug of cleaned) {
    try {
      const url = `https://${BLOG_HOST}/${slug}`;
      const jobId = await upsertJob(slug, url, reason);
      jobs.push({ jobId, slug });
    } catch (e) {
      // Don't block the publish — log and continue.
      await blog.from("indexing_audit").insert({
        url: `https://${BLOG_HOST}/${slug}`, ok: false,
        issues: [{ code: "upsert_job_failed", detail: String(e).slice(0, 200) }],
      });
    }
  }
  // Fire jobs with concurrency 5.
  const results: any[] = [];
  const queue = [...jobs];
  async function worker() {
    while (queue.length) {
      const next = queue.shift();
      if (!next) return;
      const r = await runJob(next.jobId).catch((e) => ({ ok: false, error: String(e) }));
      results.push({ slug: next.slug, ...r });
    }
  }
  await Promise.all([worker(), worker(), worker(), worker(), worker()]);
  return { ok: true, dispatched: jobs.length, results };
}

async function retry(limit = 25) {
  const now = new Date().toISOString();
  const { data: due } = await blog.from("indexing_jobs")
    .select("id, slug, url, attempts, state")
    .in("state", ["failed", "pending_auth"])
    .lte("next_retry_at", now)
    .lt("attempts", MAX_ATTEMPTS)
    .order("next_retry_at", { ascending: true })
    .limit(limit);
  const items = due ?? [];
  if (!items.length) return { ok: true, retried: 0 };
  // Mark pending so concurrent retry cycles don't double-pick.
  await blog.from("indexing_jobs").update({ state: "pending", reason: "retry" })
    .in("id", items.map((i: any) => i.id));
  const results: any[] = [];
  for (const it of items) {
    const r = await runJob((it as any).id).catch((e) => ({ ok: false, error: String(e) }));
    results.push({ slug: (it as any).slug, ...r });
  }
  return { ok: true, retried: items.length, results };
}

async function manualRetry(idOrSlug: string) {
  const { data: job } = await blog.from("indexing_jobs")
    .select("id").or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!job) return { ok: false, error: "not_found" };
  await blog.from("indexing_jobs").update({
    state: "pending", next_retry_at: null, attempts: 0, reason: "manual_retry",
  }).eq("id", (job as any).id);
  return await runJob((job as any).id);
}

async function stats() {
  const since24 = new Date(Date.now() - 24 * 3600_000).toISOString();
  const since7d = new Date(Date.now() - 7 * 86400_000).toISOString();
  const counts = async (filter: (q: any) => any) => {
    const r = await filter(blog.from("indexing_jobs").select("id", { count: "exact", head: true }));
    return r.count ?? 0;
  };
  const [queued, in_flight, pending_auth, failed, done24, dispatched7d] = await Promise.all([
    counts((q) => q.eq("state", "pending")),
    counts((q) => q.eq("state", "in_flight")),
    counts((q) => q.eq("state", "pending_auth")),
    counts((q) => q.eq("state", "failed")),
    counts((q) => q.eq("state", "done").gte("submitted_at", since24)),
    counts((q) => q.gte("created_at", since7d)),
  ]);
  const { data: recent } = await blog.from("indexing_jobs")
    .select("id, slug, url, state, attempts, providers, submitted_at, updated_at, next_retry_at, error")
    .order("updated_at", { ascending: false }).limit(25);
  const { data: failures } = await blog.from("indexing_jobs")
    .select("id, slug, url, attempts, providers, next_retry_at, error, updated_at")
    .in("state", ["failed", "pending_auth"])
    .order("updated_at", { ascending: false }).limit(25);
  const { data: lastDone } = await blog.from("indexing_jobs")
    .select("submitted_at").eq("state", "done")
    .order("submitted_at", { ascending: false }).limit(1).maybeSingle();
  return {
    counts: { queued, in_flight, pending_auth, failed, done_24h: done24, dispatched_7d: dispatched7d },
    gsc_connector: { configured: !!(LOVABLE_KEY && GSC_KEY) },
    last_done_at: (lastDone as any)?.submitted_at ?? null,
    recent: recent ?? [],
    failures: failures ?? [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "dispatch";

  if (action === "bootstrap_sql") return bootstrap();

  if (!(await isAdmin(req))) return json({ ok: false, error: "forbidden" }, 403);

  try {
    if (action === "dispatch" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const slugs: string[] = Array.isArray(body.slugs) ? body.slugs : (body.slug ? [body.slug] : []);
      return json(await dispatch(slugs, body.reason ?? "auto"));
    }
    if (action === "retry" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      return json(await retry(Number(body.limit ?? 25)));
    }
    if (action === "manual_retry" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (!body.id && !body.slug) return json({ ok: false, error: "id_or_slug_required" }, 400);
      return json(await manualRetry(body.id ?? body.slug));
    }
    if (action === "stats") return json(await stats());
    return json({ ok: false, error: `unknown_action:${action}` }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});