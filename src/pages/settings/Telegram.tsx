import Integrations from "./Integrations";

/**
 * Dedicated Telegram delivery & notifications page.
 * Currently wraps the Integrations panel (which is Telegram-first) so users have
 * a direct entry point from /settings/telegram and from the Profile hub.
 */
export default function TelegramSettings() {
  return <Integrations />;
}
