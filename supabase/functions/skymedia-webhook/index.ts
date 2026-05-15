// SkyMedia Admin Bot Webhook (multi-bot architecture).
// RECEIVE-ONLY ops channel. NO commands, NO conversational logic, NO broadcasts.
// All inbound updates are acknowledged with 200 and silently dropped.
// Outbound sends to this bot happen exclusively via admin-bot-notify / admin-alert.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-telegram-bot-api-secret-token",
};

const SKYMEDIA_TOKEN = Deno.env.get("SKYMEDIA_BOT_TOKEN") || "";

// One-time courtesy reply set: chat_ids that have already been told this bot is silent.
// Lives in-memory (resets on cold start) — that's intentional, repeat replies are fine.
const greeted = new Set<string>();

async function notifyOnce(chatId: string) {
  if (!SKYMEDIA_TOKEN || !chatId || greeted.has(chatId)) return;
  greeted.add(chatId);
  try {
    await fetch(`https://api.telegram.org/bot${SKYMEDIA_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "🛰 <b>HustleAI Ops</b>\nThis is a one-way alert channel. No commands available.",
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch { /* swallow */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const update = await req.json().catch(() => ({} as any));
    const chatId = String(
      update?.message?.chat?.id ||
      update?.edited_message?.chat?.id ||
      update?.callback_query?.message?.chat?.id ||
      ""
    );
    if (chatId) void notifyOnce(chatId);
  } catch { /* swallow */ }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});