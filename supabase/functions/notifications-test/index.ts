// Send a test notification to the calling user across all enabled providers.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dispatchNotification } from "../_shared/notifications/dispatcher.ts";
import { createArtifact } from "../_shared/artifacts/createArtifact.ts";
import { transitionArtifact } from "../_shared/artifacts/transition.ts";
import { requireCapability, guardErrorBody } from "../_shared/tier/guard.ts";
import { consumeAndCheck } from "../_shared/tier/quota.ts";

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
    const operational = body?.operational === true;

    // Sprint E Phase 3 — operational smoke-test uses Telegram-as-storage.
    // That path is tier-locked behind telegram_exports + delivery quota.
    if (operational) {
      const cap = await requireCapability(sb, user.id, "telegram_exports");
      if (!cap.ok) {
        return new Response(JSON.stringify(guardErrorBody(cap)), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const q = await consumeAndCheck(sb, user.id, "telegram_delivery", cap.capabilities.telegram_delivery_quota);
      if (!q.ok) {
        return new Response(JSON.stringify({
          error: "telegram_delivery_quota_exceeded", used: q.count, max: q.limit, tier: cap.tier,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Canonical smoke-test path: create a real artifact row, route it through
    // dispatchNotification, and let the user observe it in Exports + Telegram.
    let artifactId: string | null = null;
    if (operational) {
      const created = await createArtifact({
        user_id: user.id,
        artifact_type: "operational_test",
        source_module: "notifications-test",
        title: "Operational smoke-test notification",
        preview_text: "Sprint D canonical delivery — verifies session, FSM, telemetry and Telegram delivery in one shot.",
        metadata: { kind: "smoke_test", issued_at: new Date().toISOString() },
        artifact_origin: "operational",
        generation_source: "settings.integrations.health_rail",
        dedupe_key: `smoke_test:${user.id}:${Math.floor(Date.now() / 60_000)}`,
        storage_mode: "telegram",
        tier: cap.tier,
      });
      artifactId = created?.id ?? null;
    }

    dispatchNotification({
      user_id: user.id,
      event_key: operational ? "operational_smoke_test" : "test_notification",
      category: "system",
      source: operational ? "operational" : "settings",
      channels: provider ? [provider as any] : undefined,
      message: {
        title: operational ? "🛰 Operational smoke-test" : "🚀 Test alert from HustleAI",
        body: operational
          ? "Canonical end-to-end pipeline check. Artifact persisted, FSM advanced, delivery routed."
          : "If you can read this, your real-time notifications are working perfectly. You'll receive payment, AI task, and security alerts here.",
      },
    });

    // Reflect delivery dispatch on the FSM. The actual delivered transition
    // happens inside the dispatcher's Telegram worker.
    if (artifactId) {
      await transitionArtifact(artifactId, "delivering", {
        delivery_status: "sending",
        last_delivery_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ ok: true, queued: true, artifact_id: artifactId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});