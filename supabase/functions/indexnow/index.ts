// IndexNow automation: queue, batch-submit, retry, status.
// Submits URLs to Bing + Yandex IndexNow endpoints.
// Key file is hosted at https://hustlaiapp.in/<KEY>.txt and
// https://blogs.hustlaiapp.in/<KEY>.txt (static public/ asset).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const KEY = "e12ebc337985792c33bf311baf38a834";
const HOSTS = ["hustlaiapp.in", "blogs.hustlaiapp.in"];
const ENGINES = [
  { name: "bing", endpoint: "https://www.bing.com/indexnow" },
  { name: "yandex", endpoint: "https://yandex.com/indexnow" },
];

const main = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
const admin = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

async function isAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  // Service role short-circuit (allow internal callers like blog-admin).
  const token = auth.replace("Bearer ", "");
  if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return true;
  const { data, error } = await main.auth.getUser(token);
  if (error || !data?.user?.id) return false;
  const { data: roles } = await admin().from("user_roles")
    .select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  return !!roles;
}

function hostOf(url: string): string | null {
  try { return new URL(url).hostname; } catch { return null; }
}

async function enqueue(urls: string[], source_kind = "blog_post", source_id?: string) {
  const sb = admin();
  const cleaned = [...new Set(urls.filter(u => {
    const h = hostOf(u);
    return h && HOSTS.some(allow => h === allow || h.endsWith("." + allow));
  }))];
  if (!cleaned.length) return { inserted: 0 };
  const rows = cleaned.map(u => ({ url: u, source_kind, source_id, status: "pending" }));
  // upsert-like: rely on partial unique index for pending
  let inserted = 0;
  for (const r of rows) {
    const { error } = await sb.from("indexnow_queue").insert(r);
    if (!error) inserted++;
  }
  return { inserted, total: cleaned.length };
}

async function flush(limit = 100) {
  const sb = admin();
  // Select pending + failed-with-attempts<5
  const { data: pending, error } = await sb.from("indexnow_queue")
    .select("id,url,attempts")
    .or("status.eq.pending,and(status.eq.failed,attempts.lt.5)")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) return { ok: false, error: error.message };
  const items = pending ?? [];
  if (!items.length) return { ok: true, batched: 0, engines: [] };

  // Group by host so each batch is a single IndexNow submission.
  const byHost = new Map<string, typeof items>();
  for (const it of items) {
    const h = hostOf(it.url) ?? HOSTS[0];
    byHost.set(h, [...(byHost.get(h) ?? []), it]);
  }

  const engineResults: any[] = [];
  for (const [host, group] of byHost) {
    const urls = group.map(g => g.url);
    for (const eng of ENGINES) {
      const body = {
        host,
        key: KEY,
        keyLocation: `https://${host}/${KEY}.txt`,
        urlList: urls,
      };
      let ok = false; let status_code = 0; let err: string | undefined;
      try {
        const r = await fetch(eng.endpoint, {
          method: "POST",
          headers: { "content-type": "application/json; charset=utf-8" },
          body: JSON.stringify(body),
        });
        status_code = r.status;
        ok = r.status >= 200 && r.status < 300;
        if (!ok) err = (await r.text().catch(() => "")).slice(0, 300);
      } catch (e) {
        err = String(e).slice(0, 300);
      }
      await sb.from("indexnow_log").insert({
        engine: eng.name, url_count: urls.length, ok, status_code, error: err,
        sample_urls: urls.slice(0, 10),
      });
      engineResults.push({ engine: eng.name, host, ok, status_code, urls: urls.length });
    }
    // Update each row: success if all engines ok, otherwise failed + bump attempts.
    const allOk = engineResults
      .filter(r => r.host === host)
      .every(r => r.ok);
    const ids = group.map(g => g.id);
    if (allOk) {
      await sb.from("indexnow_queue").update({
        status: "sent", sent_at: new Date().toISOString(),
        last_attempt_at: new Date().toISOString(),
      }).in("id", ids);
    } else {
      // bump attempts row-by-row to preserve increments
      for (const g of group) {
        const nextAttempts = (g.attempts ?? 0) + 1;
        await sb.from("indexnow_queue").update({
          status: nextAttempts >= 5 ? "failed" : "failed",
          attempts: nextAttempts,
          last_attempt_at: new Date().toISOString(),
          last_error: engineResults.filter(r => r.host === host && !r.ok).map(r => `${r.engine}:${r.status_code}`).join(","),
        }).eq("id", g.id);
      }
    }
  }
  return { ok: true, batched: items.length, engines: engineResults };
}

async function status() {
  const sb = admin();
  const [{ data: queue }, { data: logs }, { data: lastSent }] = await Promise.all([
    sb.from("indexnow_queue").select("status,attempts").limit(1000),
    sb.from("indexnow_log").select("*").order("created_at", { ascending: false }).limit(20),
    sb.from("indexnow_queue").select("sent_at").eq("status", "sent").order("sent_at", { ascending: false }).limit(1),
  ]);
  const counts = { pending: 0, sent: 0, failed: 0 };
  for (const r of queue ?? []) counts[r.status as keyof typeof counts] = (counts[r.status as keyof typeof counts] ?? 0) + 1;
  const last_log = logs?.[0] ?? null;
  const successful_24h = (logs ?? []).filter(l => l.ok && new Date(l.created_at).getTime() > Date.now() - 86400000).length;
  const failed_24h = (logs ?? []).filter(l => !l.ok && new Date(l.created_at).getTime() > Date.now() - 86400000).length;
  return {
    ok: true,
    key: KEY,
    key_files: HOSTS.map(h => `https://${h}/${KEY}.txt`),
    counts,
    last_ping_at: last_log?.created_at ?? null,
    last_sent_at: lastSent?.[0]?.sent_at ?? null,
    successful_24h, failed_24h,
    recent: logs ?? [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "status";

  // Public key sanity probe (returns key — same value as the static file).
  if (action === "key" && req.method === "GET") {
    return new Response(KEY, { headers: { ...cors, "content-type": "text/plain" } });
  }

  if (!(await isAdmin(req))) return json({ ok: false, error: "forbidden" }, 403);

  try {
    if (action === "status") return json(await status());
    if (action === "enqueue" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const urls: string[] = Array.isArray(body.urls) ? body.urls : [];
      const r = await enqueue(urls, body.source_kind, body.source_id);
      return json({ ok: true, ...r });
    }
    if (action === "flush" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      return json(await flush(body.limit ?? 100));
    }
    if (action === "retry" && req.method === "POST") {
      const sb = admin();
      await sb.from("indexnow_queue").update({ status: "pending" }).eq("status", "failed");
      return json(await flush(100));
    }
    return json({ ok: false, error: "unsupported action" }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});