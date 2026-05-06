// Discord OAuth flow (frontend-only stage — no bot, no role sync yet).
// Two paths under one function:
//   GET /discord-oauth/initiate   → requires Supabase JWT, returns Discord auth URL
//   GET /discord-oauth/callback   → Discord redirects here, we exchange code,
//                                   upsert into community DB `discord_links`,
//                                   then redirect back to the app.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DISCORD_CLIENT_ID = "1501472209003086004";
const COMMUNITY_URL = "https://qeswhaytgvosfzzgraef.supabase.co";
const COMMUNITY_KEY = "sb_publishable_MfXLYdThZHM45f6V9DyNsw_ADD2HqIv";
const APP_ORIGIN = "https://hustlaiapp.in";
const SCOPES = "identify";
const FUNCTION_NAME = "discord-oauth";

function cleanBaseUrl(value: string | null | undefined) {
  return (value || "").trim().replace(/\/+$/, "");
}

function getRedirectUri(req: Request) {
  const configured = cleanBaseUrl(Deno.env.get("DISCORD_REDIRECT_URI"));
  if (configured) return configured;

  const cloudUrl = cleanBaseUrl(Deno.env.get("SUPABASE_URL"));
  if (cloudUrl) return `${cloudUrl}/functions/v1/${FUNCTION_NAME}/callback`;

  const url = new URL(req.url);
  url.protocol = "https:";
  return `${url.origin}/functions/v1/${FUNCTION_NAME}/callback`;
}

async function syncDiscordRole(userId: string) {
  const cloudUrl = cleanBaseUrl(Deno.env.get("SUPABASE_URL"));
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!cloudUrl || !serviceKey) return;

  const admin = createClient(cloudUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile } = await admin
    .from("profiles")
    .select("subscription_tier")
    .eq("user_id", userId)
    .maybeSingle();

  const syncRes = await fetch(`${cloudUrl}/functions/v1/discord-sync-role/internal`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: userId, tier: profile?.subscription_tier ?? null }),
  });

  if (!syncRes.ok) {
    console.warn("[discord-oauth] role sync trigger failed", syncRes.status, await syncRes.text().catch(() => ""));
  }
}

async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(msg),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function b64url(s: string) {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(s: string) {
  return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.pathname.split("/").pop();
  const SECRET = Deno.env.get("DISCORD_CLIENT_SECRET");
  if (!SECRET) {
    return new Response(JSON.stringify({ error: "Missing DISCORD_CLIENT_SECRET" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---------- INITIATE ----------
  if (action === "initiate") {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data, error } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (error || !data?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = data.user.id as string;
    const payload = JSON.stringify({ uid: userId, ts: Date.now() });
    const sig = await hmac(SECRET, payload);
    const state = `${b64url(payload)}.${sig}`;

    const redirectUri = getRedirectUri(req);
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      response_type: "code",
      scope: SCOPES,
      redirect_uri: redirectUri,
      state,
      prompt: "consent",
    });
    const authUrl = `https://discord.com/oauth2/authorize?${params}`;
    return new Response(JSON.stringify({ url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---------- CALLBACK ----------
  if (action === "callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const errorParam = url.searchParams.get("error");
    const back = (status: string, extra = "") =>
      Response.redirect(`${APP_ORIGIN}/community?discord=${status}${extra}`, 302);

    if (errorParam) return back("denied");
    if (!code || !state) return back("error", "&reason=missing_params");

    // Verify state signature
    const [pBody, pSig] = state.split(".");
    if (!pBody || !pSig) return back("error", "&reason=bad_state");
    let payloadStr = "";
    try { payloadStr = unb64url(pBody); } catch { return back("error", "&reason=bad_state"); }
    const expected = await hmac(SECRET, payloadStr);
    if (expected !== pSig) return back("error", "&reason=bad_sig");
    let parsed: { uid: string; ts: number };
    try { parsed = JSON.parse(payloadStr); } catch { return back("error", "&reason=bad_json"); }
    if (Date.now() - parsed.ts > 10 * 60 * 1000) return back("error", "&reason=expired");

    // Exchange code → token
    const redirectUri = getRedirectUri(req);
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) return back("error", "&reason=token_exchange");
    const token = await tokenRes.json();

    // Fetch user
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!userRes.ok) return back("error", "&reason=user_fetch");
    const dUser = await userRes.json();

    // Upsert into community DB (tertiary)
    const community = createClient(COMMUNITY_URL, COMMUNITY_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: upErr } = await community.from("discord_links").upsert(
      {
        user_id: parsed.uid,
        discord_user_id: dUser.id,
        discord_username: dUser.username ?? null,
        discord_avatar: dUser.avatar ?? null,
        discord_connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (upErr) return back("error", `&reason=db_${encodeURIComponent(upErr.message.slice(0, 60))}`);

    await syncDiscordRole(parsed.uid).catch((e) => console.warn("[discord-oauth] role sync skipped", e?.message || e));

    return back("connected");
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});