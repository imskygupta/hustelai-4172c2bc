import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { notifyOps } from "../_shared/notify-ops.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const BLOG_URL = Deno.env.get("BLOG_SUPABASE_URL") ?? "";
const BLOG_SR  = Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE") ?? "";
const MAIN_URL = Deno.env.get("SUPABASE_URL") ?? "";
const MAIN_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const MAIN_SR  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const blog = (BLOG_URL && BLOG_SR) ? createClient(BLOG_URL, BLOG_SR) : null as any;
const main = (MAIN_URL && MAIN_ANON) ? createClient(MAIN_URL, MAIN_ANON) : null as any;

const BUCKET = "blog-assets";

/* ───────────────────── observability ───────────────────── */
type Stage =
  | "env_validation" | "auth" | "bucket_access" | "storage_upload"
  | "db_read" | "db_write" | "ai_provider" | "fallback_download" | "unexpected";

function logErr(stage: Stage, err: any, ctx: Record<string, any> = {}) {
  const detail = err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : { message: String(err) };
  console.error(JSON.stringify({ scope: "blog-image-pipeline", stage, ...ctx, error: detail }));
}

function alertOps(stage: Stage, err: any, ctx: Record<string, any> = {}) {
  try {
    notifyOps("webhook_failed", {
      note: `blog-image-pipeline · ${stage}: ${(err?.message ?? err ?? "unknown").toString().slice(0, 280)}`,
      ...ctx,
    });
  } catch { /* never throw */ }
}

function jsonOk(body: Record<string, any>, status = 200) {
  return new Response(JSON.stringify({ ok: true, ...body }), {
    status, headers: { ...cors, "content-type": "application/json" },
  });
}
function jsonFail(error: string, body: Record<string, any> = {}, status = 200) {
  return new Response(JSON.stringify({ ok: false, error, ...body }), {
    status, headers: { ...cors, "content-type": "application/json" },
  });
}

function validateEnv(): { ok: true } | { ok: false; missing: string[] } {
  const missing = [
    !BLOG_URL && "BLOG_SUPABASE_URL",
    !BLOG_SR && "BLOG_SUPABASE_SERVICE_ROLE",
    !MAIN_URL && "SUPABASE_URL",
    !MAIN_ANON && "SUPABASE_ANON_KEY",
    !MAIN_SR && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean) as string[];
  if (missing.length) return { ok: false, missing };
  return { ok: true };
}

/* ───────────────────────── auth ───────────────────────── */
async function isAdmin(req: Request): Promise<boolean> {
  try {
    if (!main) return false;
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return false;
    const { data, error } = await main.auth.getUser(auth.replace("Bearer ", ""));
    if (error || !data?.user?.id) return false;
    const admin = createClient(MAIN_URL, MAIN_SR);
    const { data: r } = await admin.from("user_roles").select("role")
      .eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
    return !!r;
  } catch (e) {
    logErr("auth", e);
    return false;
  }
}

/* ───────────────────── bucket bootstrap ─────────────────── */
async function ensureBucket(): Promise<{ ok: boolean; created?: boolean; error?: string }> {
  try {
    const { data: list, error: listErr } = await blog.storage.listBuckets();
    if (listErr) { logErr("bucket_access", listErr); return { ok: false, error: listErr.message }; }
    if (list?.some((b: any) => b.id === BUCKET)) return { ok: true, created: false };
    const { error } = await blog.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 8 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    if (error && !/already exists/i.test(error.message)) {
      logErr("bucket_access", error, { bucket: BUCKET, op: "create" });
      return { ok: false, error: error.message };
    }
    return { ok: true, created: true };
  } catch (e: any) {
    logErr("bucket_access", e, { bucket: BUCKET });
    return { ok: false, error: String(e?.message ?? e) };
  }
}

/* ────────────────────── placeholders ────────────────────── */
const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  "freelancer-workflows":  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&q=80&auto=format&fit=crop",
  "client-systems":        "https://images.unsplash.com/photo-1552581234-26160f608093?w=1600&q=80&auto=format&fit=crop",
  "async-operations":      "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1600&q=80&auto=format&fit=crop",
  "ai-operations":         "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1600&q=80&auto=format&fit=crop",
  "creator-workflows":     "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1600&q=80&auto=format&fit=crop",
  "telegram-delivery":     "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1600&q=80&auto=format&fit=crop",
  "default":               "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1600&q=80&auto=format&fit=crop",
};
function placeholderFor(catSlug?: string | null): string {
  return CATEGORY_PLACEHOLDERS[catSlug || "default"] ?? CATEGORY_PLACEHOLDERS.default;
}

/* ───────────────────── prompt + AI gen ──────────────────── */
function buildPrompt(post: any): string {
  const cat = post?.blog_categories?.title || post?.suggested_category || "freelance workflows";
  const t = (post?.title || "operational workflow notes").slice(0, 140);
  const k = post?.focus_keyword ? ` Theme: ${post.focus_keyword}.` : "";
  return [
    `Editorial hero image for an article titled: "${t}".`,
    `Topic area: ${cat}.${k}`,
    "Calm, premium, magazine-grade composition. Soft natural light, muted earthy palette,",
    "shallow depth of field, abstract workflow / operational metaphor (desk, paper, screens, soft geometry).",
    "No text, no logos, no watermarks, no UI mockups. 16:9 cinematic aspect.",
  ].join(" ");
}

async function generateImage(post: any): Promise<Uint8Array | null> {
  try {
    if (!LOVABLE_KEY) { logErr("ai_provider", "missing LOVABLE_API_KEY"); return null; }
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${LOVABLE_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: buildPrompt(post) }],
        modalities: ["image", "text"],
      }),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      logErr("ai_provider", `status ${r.status}`, { post_id: post?.id, body: body.slice(0, 500) });
      if (r.status === 402 || r.status === 429) {
        alertOps("ai_provider", `${r.status} ${body.slice(0, 200)}`, { post_id: post?.id });
      }
      return null;
    }
    const j = await r.json();
    const url = j?.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;
    if (!url?.startsWith("data:image/")) return null;
    const b64 = url.split(",")[1];
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch (e) {
    logErr("ai_provider", e, { post_id: post?.id });
    return null;
  }
}

async function downloadFallback(url: string): Promise<Uint8Array | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) { logErr("fallback_download", `status ${r.status}`, { url }); return null; }
    return new Uint8Array(await r.arrayBuffer());
  } catch (e) { logErr("fallback_download", e, { url }); return null; }
}

/* ────────────────── upload + persist ─────────────────────── */
async function uploadHero(postId: string, bytes: Uint8Array, contentType = "image/png"): Promise<string | null> {
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const path = `hero/${postId}-${Date.now()}.${ext}`;
  const { error } = await blog.storage.from(BUCKET).upload(path, bytes, {
    contentType, upsert: true, cacheControl: "31536000",
  });
  if (error) { logErr("storage_upload", error, { post_id: postId, path }); alertOps("storage_upload", error, { post_id: postId }); return null; }
  const { data } = blog.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function processPost(postId: string, opts: { customUrl?: string; force?: boolean } = {}) {
  const { data: post, error: readErr } = await blog.from("blog_posts")
    .select("id, slug, title, focus_keyword, hero_image, category_id, blog_categories(slug,title)")
    .eq("id", postId).maybeSingle();
  if (readErr) { logErr("db_read", readErr, { post_id: postId }); alertOps("db_read", readErr, { post_id: postId }); return; }
  if (!post) return;

  // already on our CDN — skip unless forced
  if (!opts.force && !opts.customUrl && post.hero_image?.includes(`/storage/v1/object/public/${BUCKET}/`)) return;

  let bytes: Uint8Array | null = null;
  let ct = "image/png";

  if (opts.customUrl) {
    bytes = await downloadFallback(opts.customUrl);
    ct = opts.customUrl.endsWith(".jpg") || opts.customUrl.endsWith(".jpeg") ? "image/jpeg" : "image/png";
  } else {
    bytes = await generateImage(post);
  }

  if (!bytes) {
    // deterministic placeholder fallback
    const ph = placeholderFor((post as any).blog_categories?.slug);
    bytes = await downloadFallback(ph);
    ct = "image/jpeg";
  }
  if (!bytes) return;

  const url = await uploadHero(post.id, bytes, ct);
  if (url) {
    const { error: upErr } = await blog.from("blog_posts").update({ hero_image: url }).eq("id", post.id);
    if (upErr) { logErr("db_write", upErr, { post_id: post.id }); alertOps("db_write", upErr, { post_id: post.id }); return; }
    try { await blog.from("blog_pipeline_status").upsert({ id: 1, last_generated_at: new Date().toISOString() }); } catch { /* table optional */ }
  }
}

/* ───────────────────────── handler ───────────────────────── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "status";

  try {
    // Env validation up front so status never blows up silently
    const envCheck = validateEnv();
    if (!envCheck.ok) {
      logErr("env_validation", `missing: ${envCheck.missing.join(", ")}`);
      alertOps("env_validation", `missing: ${envCheck.missing.join(", ")}`);
      return jsonFail("ENV_VALIDATION_FAILED", { missing: envCheck.missing });
    }

    // Internal call from other edge functions: ?key=<service role>
    const serviceKey = url.searchParams.get("key");
    const internal = serviceKey && serviceKey === BLOG_SR;
    const admin = internal ? true : await isAdmin(req);

    if (action === "ensure_bucket") {
      if (!admin) return jsonFail("forbidden", {}, 403);
      const r = await ensureBucket();
      return r.ok ? jsonOk(r) : jsonFail("BUCKET_ACCESS_FAILED", { details: r.error });
    }

    if (action === "status") {
      if (!admin) return jsonFail("forbidden", {}, 403);

      // Each diagnostic is wrapped so a single failure never breaks the whole status response.
      const diagnostics: Record<string, any> = {};

      // Bucket
      let bucketStatus: "ok" | "missing" | "error" = "error";
      try {
        const { data: list, error } = await blog.storage.listBuckets();
        if (error) { logErr("bucket_access", error); diagnostics.bucket_error = error.message; }
        else bucketStatus = list?.some((b: any) => b.id === BUCKET) ? "ok" : "missing";
      } catch (e: any) { logErr("bucket_access", e); diagnostics.bucket_error = String(e?.message ?? e); }

      // Posts
      let posts: any[] = [];
      try {
        const { data, error } = await blog.from("blog_posts")
          .select("id, slug, title, hero_image, status, published_at")
          .order("published_at", { ascending: false, nullsFirst: false }).limit(200);
        if (error) { logErr("db_read", error, { table: "blog_posts" }); diagnostics.posts_error = error.message; }
        else posts = data ?? [];
      } catch (e: any) { logErr("db_read", e, { table: "blog_posts" }); diagnostics.posts_error = String(e?.message ?? e); }

      const internalPrefix = `/storage/v1/object/public/${BUCKET}/`;
      const total = posts.length;
      const with_internal = posts.filter(p => p.hero_image?.includes(internalPrefix)).length;
      const with_external = posts.filter(p => p.hero_image && !p.hero_image.includes(internalPrefix)).length;
      const missing = posts.filter(p => !p.hero_image).length;
      const migration_progress_pct = total ? Math.round((with_internal / total) * 100) : 0;

      // Provider availability — soft check (key presence)
      const provider_available = !!LOVABLE_KEY;

      // Last generated image timestamp — best-effort from optional status table
      let last_generated_at: string | null = null;
      try {
        const { data: ls } = await blog.from("blog_pipeline_status").select("last_generated_at").eq("id", 1).maybeSingle();
        last_generated_at = (ls as any)?.last_generated_at ?? null;
      } catch { /* table is optional */ }

      const stats = {
        bucket_status: bucketStatus,
        provider_available,
        last_generated_at,
        last_successful_run: new Date().toISOString(),
        total,
        with_internal,
        with_external,
        missing,
        queued: with_external + missing,   // posts waiting for ingestion
        failed: 0,                          // no per-post job table yet
        migration_progress_pct,
      };
      return jsonOk({ stats, posts, diagnostics });
    }

    if (req.method === "POST" && action === "regenerate") {
      if (!admin) return jsonFail("forbidden", {}, 403);
      const body = await req.json().catch(() => ({}));
      const { post_id, custom_url, force } = body;
      if (!post_id) return jsonFail("post_id required", {}, 400);
      await ensureBucket();
      // @ts-ignore EdgeRuntime
      EdgeRuntime.waitUntil(processPost(post_id, { customUrl: custom_url, force: !!force || !!custom_url }));
      return jsonOk({ queued: true }, 202);
    }

    if (req.method === "POST" && action === "migrate") {
      if (!admin) return jsonFail("forbidden", {}, 403);
      const body = await req.json().catch(() => ({}));
      const limit = Math.min(Number(body.limit ?? 25), 50);
      await ensureBucket();
      const internalPrefix = `/storage/v1/object/public/${BUCKET}/`;
      const { data: posts, error: readErr } = await blog.from("blog_posts")
        .select("id, hero_image").eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false }).limit(500);
      if (readErr) { logErr("db_read", readErr, { table: "blog_posts" }); alertOps("db_read", readErr); return jsonFail("DB_READ_FAILED", { details: readErr.message }); }
      const targets = (posts ?? []).filter(p => !p.hero_image || !p.hero_image.includes(internalPrefix)).slice(0, limit);
      // @ts-ignore
      EdgeRuntime.waitUntil((async () => {
        for (const p of targets) { try { await processPost(p.id); } catch (e) { logErr("unexpected", e, { post_id: p.id, op: "migrate" }); } }
      })());
      return jsonOk({ queued: targets.length }, 202);
    }

    return jsonFail("UNKNOWN_ACTION", { action }, 400);
  } catch (e) {
    logErr("unexpected", e, { url: req.url });
    alertOps("unexpected", e, { url: req.url });
    return jsonFail("UNEXPECTED_PIPELINE_FAILURE", { details: String((e as any)?.message ?? e) });
  }
});