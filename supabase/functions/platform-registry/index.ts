// platform-registry — admin-only single endpoint backing the Platform Registry UI.
// Actions: routes | subdomains | databases | health_audit | overview | snapshot
// 5-min in-memory cache. PRIMARY DB is never written.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const PRIMARY_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Optional secondary DBs (used to ping). Reads only.
const SIDECAR_DBS: Array<{ key: string; ref: string; url_env: string; key_env: string; purpose: string }> = [
  { key: "primary", ref: "vbnqaovxatucrgtnggea", url_env: "SUPABASE_URL", key_env: "SUPABASE_SERVICE_ROLE_KEY", purpose: "Auth + billing kernel" },
  { key: "blog", ref: "ynvfxxmhowlvhtqiigfc", url_env: "BLOG_SUPABASE_URL", key_env: "BLOG_SUPABASE_SERVICE_ROLE_KEY", purpose: "Blog / SEO / content" },
  { key: "workspace", ref: "utflzmecghdtcjupgdan", url_env: "WORKSPACE_SUPABASE_URL", key_env: "WORKSPACE_SUPABASE_SERVICE_ROLE_KEY", purpose: "Workspace / intake" },
  { key: "community", ref: "qeswhaytgvosfzzgraef", url_env: "COMMUNITY_SUPABASE_URL", key_env: "COMMUNITY_SUPABASE_SERVICE_ROLE_KEY", purpose: "Community / forum / analytics" },
  { key: "ai", ref: "larncwugkdclkhayfjle", url_env: "AI_SUPABASE_URL", key_env: "AI_SUPABASE_SERVICE_ROLE_KEY", purpose: "AI chat memory / runtime" },
  { key: "admin", ref: "rqqiujmiagauzohdqjmi", url_env: "ADMIN_SUPABASE_URL", key_env: "ADMIN_SUPABASE_SERVICE_ROLE_KEY", purpose: "Admin / ops control plane" },
  { key: "owned", ref: "wguuipsikboqqinqeehv", url_env: "OWNED_SUPABASE_URL", key_env: "OWNED_SUPABASE_SERVICE_ROLE_KEY", purpose: "Owned ops mirror / telemetry" },
];

const SUBDOMAINS = [
  { host: "hustlaiapp.in", role: "primary app", sitemap: "/sitemap.xml", robots: "/robots.txt" },
  { host: "blogs.hustlaiapp.in", role: "blog", sitemap: "/sitemap.xml", robots: "/robots.txt" },
  { host: "docs.hustlaiapp.in", role: "docs", sitemap: "/sitemap.xml", robots: "/robots.txt" },
];

type CacheEntry = { at: number; data: unknown };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 1000;

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": `private, max-age=${TTL_MS / 1000}` },
  });
}

async function isAdmin(authHeader: string | null): Promise<{ ok: boolean; uid?: string }> {
  if (!authHeader?.startsWith("Bearer ")) return { ok: false };
  const sb = createClient(PRIMARY_URL, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data } = await sb.auth.getClaims(authHeader.slice(7));
  const uid = data?.claims?.sub as string | undefined;
  if (!uid) return { ok: false };
  const svc = createClient(PRIMARY_URL, SVC);
  const { data: ok } = await svc.rpc("has_role", { _user_id: uid, _role: "admin" });
  return { ok: ok === true, uid };
}

async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((res) => setTimeout(() => res(fallback), ms)),
  ]);
}

async function headCheck(url: string): Promise<{ status: number; ok: boolean; ms: number }> {
  const t0 = Date.now();
  try {
    const r = await withTimeout(fetch(url, { method: "HEAD", redirect: "follow" }), 4000, new Response(null, { status: 0 }));
    return { status: r.status, ok: r.status > 0 && r.status < 400, ms: Date.now() - t0 };
  } catch {
    return { status: 0, ok: false, ms: Date.now() - t0 };
  }
}

async function pingDb(url: string | undefined, key: string | undefined) {
  if (!url || !key) return { reachable: false, configured: false, ms: 0 };
  const t0 = Date.now();
  try {
    const r = await withTimeout(
      fetch(`${url}/rest/v1/?select=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } }),
      2500,
      new Response(null, { status: 0 }),
    );
    return { reachable: r.status > 0 && r.status < 500, configured: true, ms: Date.now() - t0, status: r.status };
  } catch {
    return { reachable: false, configured: true, ms: Date.now() - t0 };
  }
}

async function getDatabases() {
  const rows = await Promise.all(
    SIDECAR_DBS.map(async (d) => {
      const url = Deno.env.get(d.url_env);
      const key = Deno.env.get(d.key_env);
      const ping = await pingDb(url, key);
      return {
        key: d.key,
        ref: d.ref,
        purpose: d.purpose,
        url_env: d.url_env,
        key_env: d.key_env,
        configured: ping.configured,
        reachable: ping.reachable,
        latency_ms: ping.ms,
        dashboard_url: `https://supabase.com/dashboard/project/${d.ref}`,
        last_checked: new Date().toISOString(),
      };
    }),
  );
  return rows;
}

async function getSubdomains() {
  const results = await Promise.all(
    SUBDOMAINS.map(async (s) => {
      const root = await headCheck(`https://${s.host}/`);
      const sm = await headCheck(`https://${s.host}${s.sitemap}`);
      const rb = await headCheck(`https://${s.host}${s.robots}`);
      return {
        host: s.host,
        role: s.role,
        url: `https://${s.host}/`,
        sitemap_url: `https://${s.host}${s.sitemap}`,
        robots_url: `https://${s.host}${s.robots}`,
        ssl_ok: root.ok,
        root_status: root.status,
        sitemap_ok: sm.ok,
        robots_ok: rb.ok,
        last_checked: new Date().toISOString(),
      };
    }),
  );
  return results;
}

async function probeRoutes(routes: Array<{ path: string; type: string; dynamic: boolean; catchAll: boolean }>, base: string) {
  // Sample only static public routes (skip dynamic, catch-all, admin, redirects). Max 40.
  const sample = routes
    .filter((r) => !r.dynamic && !r.catchAll && r.type === "public" && r.path.startsWith("/"))
    .slice(0, 40);
  const results = await Promise.all(
    sample.map(async (r) => {
      const h = await headCheck(`${base}${r.path}`);
      return { path: r.path, status: h.status, ok: h.ok, ms: h.ms };
    }),
  );
  return { sampled: results.length, results, base };
}

async function buildOverview(req: Request) {
  const [dbs, subs] = await Promise.all([getDatabases(), getSubdomains()]);
  return {
    db_count: dbs.length,
    db_reachable: dbs.filter((d) => d.reachable).length,
    subdomains_total: subs.length,
    subdomains_online: subs.filter((s) => s.ssl_ok).length,
    sitemaps_ok: subs.filter((s) => s.sitemap_ok).length,
    generated_at: new Date().toISOString(),
  };
}

async function snapshot(routesCount: number) {
  const [dbs, subs, overview] = await Promise.all([getDatabases(), getSubdomains(), buildOverview(new Request("https://x"))]);
  const ADMIN_URL = Deno.env.get("ADMIN_SUPABASE_URL");
  const ADMIN_KEY = Deno.env.get("ADMIN_SUPABASE_SERVICE_ROLE_KEY");
  const payload = {
    taken_at: new Date().toISOString(),
    route_count: routesCount,
    working_routes: null,
    broken_routes: null,
    db_count: dbs.length,
    db_reachable: overview.db_reachable,
    subdomains_online: overview.subdomains_online,
    sitemap_count: overview.sitemaps_ok,
    payload: { dbs, subs, overview },
  };
  if (ADMIN_URL && ADMIN_KEY) {
    const adminDb = createClient(ADMIN_URL, ADMIN_KEY);
    await adminDb.from("infra_snapshots").insert(payload as any);
  }
  return { ok: true, persisted: !!(ADMIN_URL && ADMIN_KEY), payload };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "overview";
  const skipCache = url.searchParams.get("nocache") === "1";

  // snapshot can be triggered by cron with the service role bearer
  const isCronSnapshot = action === "snapshot" && req.headers.get("Authorization")?.includes(SVC);
  if (!isCronSnapshot) {
    const auth = await isAdmin(req.headers.get("Authorization"));
    if (!auth.ok) return j({ error: "admin only" }, 403);
  }

  const cacheKey = `${action}:${url.searchParams.get("base") || ""}`;
  if (!skipCache && cache.has(cacheKey)) {
    const e = cache.get(cacheKey)!;
    if (Date.now() - e.at < TTL_MS) return j({ cached: true, ...(e.data as Record<string, unknown>) });
  }

  try {
    let data: any;
    switch (action) {
      case "databases": data = { databases: await getDatabases() }; break;
      case "subdomains": data = { subdomains: await getSubdomains() }; break;
      case "routes": {
        // routes themselves are passed in via POST body (from the manifest)
        if (req.method !== "POST") { data = { error: "POST manifest in body" }; break; }
        const body = await req.json().catch(() => ({}));
        const routes = Array.isArray(body?.routes) ? body.routes : [];
        const base = String(body?.base || url.searchParams.get("base") || "https://hustlaiapp.in");
        data = await probeRoutes(routes, base);
        break;
      }
      case "overview": data = await buildOverview(req); break;
      case "health_audit": {
        const [dbs, subs] = await Promise.all([getDatabases(), getSubdomains()]);
        data = {
          databases: dbs,
          subdomains: subs,
          issues: [
            ...dbs.filter((d) => d.configured && !d.reachable).map((d) => ({ kind: "db_unreachable", target: d.key })),
            ...subs.filter((s) => !s.sitemap_ok).map((s) => ({ kind: "sitemap_missing", target: s.host })),
            ...subs.filter((s) => !s.robots_ok).map((s) => ({ kind: "robots_missing", target: s.host })),
            ...subs.filter((s) => !s.ssl_ok).map((s) => ({ kind: "subdomain_down", target: s.host })),
          ],
          generated_at: new Date().toISOString(),
        };
        break;
      }
      case "snapshot": {
        const body = await req.json().catch(() => ({}));
        data = await snapshot(Number(body?.route_count) || 0);
        break;
      }
      default: return j({ error: `unknown action ${action}` }, 400);
    }
    cache.set(cacheKey, { at: Date.now(), data });
    return j(data);
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});