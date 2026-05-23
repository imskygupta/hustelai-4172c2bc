// Stable Telegram deep-link reconstruction. Keep edge + frontend in sync.
// Two shapes:
//   1. Private channel/group message: https://t.me/c/<channel_id>/<message_id>
//      where channel_id strips the leading -100 prefix.
//   2. Bot DM fallback: https://t.me/<bot_username>?start=art_<artifact_id>

export function buildTelegramDeepLink(opts: {
  chatId?: string | null;
  messageId?: string | null;
  botUsername?: string | null;
  artifactId?: string | null;
}): string | null {
  const { chatId, messageId, botUsername, artifactId } = opts;
  if (chatId && messageId) {
    const raw = String(chatId);
    // Private supergroup/channel ids look like "-1001234567890" → "1234567890"
    const norm = raw.startsWith("-100") ? raw.slice(4) : raw.replace(/^-/, "");
    if (/^\d+$/.test(norm)) return `https://t.me/c/${norm}/${messageId}`;
  }
  if (botUsername && artifactId) {
    return `https://t.me/${botUsername.replace(/^@/, "")}?start=art_${artifactId}`;
  }
  return null;
}