import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const BLOG_URL = Deno.env.get("BLOG_SUPABASE_URL")!;
const BLOG_SR  = Deno.env.get("BLOG_SUPABASE_SERVICE_ROLE")!;
const blog = createClient(BLOG_URL, BLOG_SR);
const main = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);

const BUCKET = "blog-assets";

/* ───────────────────────── auth ───────────────────────── */
async function isAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const { data, error } = await main.auth.getClaims(auth.replace("Bearer ", ""));
  if (error || !data?.claims?.sub) return false;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: r } = await admin.from("user_roles").select("role")
    .eq("user_id", data.claims.sub).eq("role", "admin").maybeSingle();
  return !!r;
}

/* ───────────────────── bucket bootstrap ─────────────────── */
async function ensureBucket(): Promise<{ ok: boolean; created?: boolean; error?: string }> {
  const { data: list } = await blog.storage.listBuckets();
  if (list?.some((b: any) => b.id === BUCKET)) return { ok: true, created: false };
  const { error } = await blog.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 8 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (error && !/already exists/i.test(error.message)) return { ok: false, error: error.message };
  return { ok: true, created: true };
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
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: buildPrompt(post) }],
        modalities: ["image", "text"],
      }),
    });
    if (!r.ok) { console.error("ai_gateway", r.status, await r.text()); return null; }
    const j = await r.json();
    const url = j?.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;
    if (!url?.startsWith("data:image/")) return null;
    const b64 = url.split(",")[1];
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch (e) {
    console.error("generateImage failed", e);
    return null;
  }
}

async function downloadFallback(url: string): Promise<Uint8Array | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return new Uint8Array(await r.arrayBuffer());
  } catch { return null; }
}

/* ────────────────── upload + persist ─────────────────────── */
async function uploadHero(postId: string, bytes: Uint8Array, contentType = "image/png"): Promise<string | null> {
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const path = `hero/${postId}-${Date.now()}.${ext}`;
  const { error } = await blog.storage.from(BUCKET).upload(path, bytes, {
    contentType, upsert: true, cacheControl: "31536000",
  });
  if (error) { console.error("upload", error); return null; }
  const { data } = blog.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function processPost(postId: string, opts: { customUrl?: string; force?: boolean } = {}) {
  const { data: post } = await blog.from("blog_posts")
    .select("id, slug, title, focus_keyword, hero_image, category_id, blog_categories(slug,title)")
    .eq("id", postId).maybeSingle();
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
  if (url) await blog.from("blog_posts").update({ hero_image: url }).eq("id", post.id);
}

/* ───────────────────────── handler ───────────────────────── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "status";

  try {
    // Internal call from other edge functions: ?key=<service role>
    const serviceKey = url.searchParams.get("key");
    const internal = serviceKey && serviceKey === BLOG_SR;
    const admin = internal ? true : await isAdmin(req);

    if (action === "ensure_bucket") {
      if (!admin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...cors, "content-type": "application/json" } });
      const r = await ensureBucket();
      return new Response(JSON.stringify(r), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (action === "status") {
      if (!admin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...cors, "content-type": "application/json" } });
      const { data: posts } = await blog.from("blog_posts")
        .select("id, slug, title, hero_image, status, published_at")
        .order("published_at", { ascending: false, nullsFirst: false }).limit(200);
      const internalPrefix = `/storage/v1/object/public/${BUCKET}/`;
      const stats = {
        total: posts?.length ?? 0,
        with_internal: posts?.filter(p => p.hero_image?.includes(internalPrefix)).length ?? 0,
        with_external: posts?.filter(p => p.hero_image && !p.hero_image.includes(internalPrefix)).length ?? 0,
        missing: posts?.filter(p => !p.hero_image).length ?? 0,
      };
      return new Response(JSON.stringify({ stats, posts }), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (req.method === "POST" && action === "regenerate") {
      if (!admin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...cors, "content-type": "application/json" } });
      const body = await req.json().catch(() => ({}));
      const { post_id, custom_url, force } = body;
      if (!post_id) return new Response(JSON.stringify({ error: "post_id required" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
      await ensureBucket();
      // @ts-ignore EdgeRuntime
      EdgeRuntime.waitUntil(processPost(post_id, { customUrl: custom_url, force: !!force || !!custom_url }));
      return new Response(JSON.stringify({ ok: true, queued: true }), { status: 202, headers: { ...cors, "content-type": "application/json" } });
    }

    if (req.method === "POST" && action === "migrate") {
      if (!admin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...cors, "content-type": "application/json" } });
      const body = await req.json().catch(() => ({}));
      const limit = Math.min(Number(body.limit ?? 25), 50);
      await ensureBucket();
      const internalPrefix = `/storage/v1/object/public/${BUCKET}/`;
      const { data: posts } = await blog.from("blog_posts")
        .select("id, hero_image").eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false }).limit(500);
      const targets = (posts ?? []).filter(p => !p.hero_image || !p.hero_image.includes(internalPrefix)).slice(0, limit);
      // @ts-ignore
      EdgeRuntime.waitUntil((async () => {
        for (const p of targets) { try { await processPost(p.id); } catch (e) { console.error("migrate", p.id, e); } }
      })());
      return new Response(JSON.stringify({ ok: true, queued: targets.length }), { status: 202, headers: { ...cors, "content-type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unsupported" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    console.error("blog-image-pipeline", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});