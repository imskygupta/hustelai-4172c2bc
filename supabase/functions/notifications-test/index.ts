// Send a test notification to the calling user across all enabled providers.
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

    const body = await req.json().catch(() => ({}));
    const provider = body?.provider as string | undefined;

    dispatchNotification({
      user_id: user.id,
      event_key: "test_notification",
      category: "system",
      source: "settings",
      channels: provider ? [provider as any] : undefined,
      message: {
        title: "🚀 Test alert from HustleAI",
        body: "If you can read this, your real-time notifications are working perfectly. You'll receive payment, AI task, and security alerts here.",
      },
    });

    return new Response(JSON.stringify({ ok: true, queued: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});