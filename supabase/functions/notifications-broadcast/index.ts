// Admin-only: send a platform-wide alert. Inserts a broadcast row + fans out
// to notification_events for every targeted user (segmented by tier).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dispatchNotification } from "../_shared/notifications/dispatcher.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    const token = auth?.replace("Bearer ", "");
    if (!token) throw new Error("Unauthorized");
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Not admin");

    const body = await req.json();
    const { title, message, link, target_tier = "all", category = "announcement",
            channels = ["in_app", "telegram"], dispatch_external = false } = body || {};
    if (!title || !message) throw new Error("title + message required");

    const { data: bcast, error: bErr } = await sb.from("notification_broadcasts").insert({
      title, body: message, link: link || null, target_tier, category, channels, created_by: user.id,
    }).select().single();
    if (bErr) throw bErr;

    // Fan out
    let q = sb.from("profiles").select("user_id, email, subscription_tier");
    if (target_tier !== "all") q = q.eq("subscription_tier", target_tier);
    const { data: users } = await q;

    let fanOut = 0;
    for (const u of users || []) {
      // In-app event row (always)
      await sb.from("notification_events").insert({
        user_id: u.user_id,
        event_key: "broadcast",
        category,
        title, body: message, link: link || null,
        source: "admin_broadcast",
        payload: { broadcast_id: bcast.id, target_tier },
      });
      // Optional Telegram/email push for connected users
      if (dispatch_external) {
        dispatchNotification({
          user_id: u.user_id, event_key: "broadcast", category,
          message: { title, body: message, url: link || undefined },
          source: "admin_broadcast",
        });
      }
      fanOut++;
    }
    return new Response(JSON.stringify({ ok: true, broadcast_id: bcast.id, sent_to: fanOut }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});