// Discord role sync — assigns the correct tier role on the configured guild.
// Two callable modes:
//   POST /discord-sync-role           → uses caller's JWT, syncs THEIR role
//   POST /discord-sync-role/internal  → service-role only, body { user_id, tier }
//                                      called from payment edge functions on tier change
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const COMMUNITY_URL = "https://qeswhaytgvosfzzgraef.supabase.co";
const COMMUNITY_KEY = "sb_publishable_MfXLYdThZHM45f6V9DyNsw_ADD2HqIv";

const ROLE_PRO     = "1501478581140983889";
const ROLE_ELITE   = "1501478836179701800";
const ROLE_INFINITY = "1501479076580560979";
const ALL_TIER_ROLES = [ROLE_PRO, ROLE_ELITE, ROLE_INFINITY];

function roleForTier(tier: string | null | undefined): string | null {
  switch ((tier || "").toLowerCase()) {
    case "pro": return ROLE_PRO;
    case "elite": return ROLE_ELITE;
    case "infinity": return ROLE_INFINITY;
    default: return null; // free / unknown → no tier role
  }
}

async function discord(path: string, init: RequestInit = {}) {
  const token = Deno.env.get("DISCORD_BOT_TOKEN")!;
  return fetch(`https://discord.com/api/v10${path}`, {
    ...init,
    headers: {
      "Authorization": `Bot ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

async function syncOne(userId: string, tier: string | null) {
  const guildId = Deno.env.get("DISCORD_GUILD_ID");
  const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
  if (!guildId || !botToken) {
    return { ok: false, reason: "missing_discord_env" };
  }

  const community = createClient(COMMUNITY_URL, COMMUNITY_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: link } = await community
    .from("discord_links")
    .select("discord_user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!link?.discord_user_id) return { ok: false, reason: "not_linked" };

  const dId = link.discord_user_id as string;
  const targetRole = roleForTier(tier);

  // Check if member exists in guild
  const memberRes = await discord(`/guilds/${guildId}/members/${dId}`);
  if (memberRes.status === 404) {
    return { ok: false, reason: "user_not_in_guild" };
  }
  if (!memberRes.ok) {
    const t = await memberRes.text();
    return { ok: false, reason: `member_fetch_${memberRes.status}`, detail: t.slice(0, 120) };
  }
  const member = await memberRes.json();
  const currentRoles: string[] = member.roles || [];

  // Remove all tier roles that aren't the target
  for (const r of ALL_TIER_ROLES) {
    if (currentRoles.includes(r) && r !== targetRole) {
      await discord(`/guilds/${guildId}/members/${dId}/roles/${r}`, { method: "DELETE" });
    }
  }
  // Add target role if needed
  if (targetRole && !currentRoles.includes(targetRole)) {
    const addRes = await discord(`/guilds/${guildId}/members/${dId}/roles/${targetRole}`, { method: "PUT" });
    if (!addRes.ok) {
      const t = await addRes.text();
      return { ok: false, reason: `role_add_${addRes.status}`, detail: t.slice(0, 120) };
    }
  }

  // Persist last-sync metadata
  await community.from("discord_links").update({
    last_synced_tier: tier || null,
    last_synced_at: new Date().toISOString(),
  }).eq("user_id", userId);

  return { ok: true, tier: tier || "free", assigned: targetRole };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const isInternal = url.pathname.endsWith("/internal");

  try {
    if (isInternal) {
      // Internal call from other edge functions — require service role key.
      const auth = req.headers.get("Authorization") || "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      if (auth !== `Bearer ${serviceKey}`) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body = await req.json().catch(() => ({}));
      const userId = body?.user_id as string | undefined;
      const tier = body?.tier as string | undefined;
      if (!userId) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await syncOne(userId, tier ?? null);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User-triggered manual sync
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
    const { data: claims, error: cErr } = await sb.auth.getClaims(auth.replace("Bearer ", ""));
    if (cErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    // Fetch tier from primary DB profiles
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: prof } = await admin
      .from("profiles")
      .select("subscription_tier")
      .eq("user_id", userId)
      .maybeSingle();

    const result = await syncOne(userId, prof?.subscription_tier ?? null);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Internal" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});