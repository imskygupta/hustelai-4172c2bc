/**
 * Cross-tab + cross-host signout propagation.
 *
 * Both `hustlaiapp.in` and `workspace.hustlaiapp.in` instantiate this on
 * load. When one tab signs out we broadcast to the other tabs (same origin
 * via BroadcastChannel) AND to other origins (`.hustlaiapp.in` cookie
 * scope) by clearing the bridge cookie. Other tabs detect the cookie
 * removal on next auth tick / visibility change and clear their own state.
 *
 * Storage events also fire on Supabase token removal — we listen to those
 * to keep multi-tab dashboards in sync without reload storms.
 */
const CHANNEL_NAME = "hai_auth_v1";
const SIGNOUT_LS_KEY = "hai_auth_signout_at";

export type AuthBroadcastMessage =
  | { type: "signout"; at: number }
  | { type: "expired"; at: number };

let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (channel) return channel;
  try { channel = new BroadcastChannel(CHANNEL_NAME); } catch { channel = null; }
  return channel;
}

export function broadcastSignout() {
  const msg: AuthBroadcastMessage = { type: "signout", at: Date.now() };
  try { getChannel()?.postMessage(msg); } catch { /* ignore */ }
  // localStorage write fans out to other tabs in the SAME origin even if
  // BroadcastChannel is unavailable (Safari private, older browsers).
  try { localStorage.setItem(SIGNOUT_LS_KEY, String(msg.at)); } catch { /* ignore */ }
}

export function broadcastExpired() {
  const msg: AuthBroadcastMessage = { type: "expired", at: Date.now() };
  try { getChannel()?.postMessage(msg); } catch { /* ignore */ }
}

export function subscribeAuthBroadcast(
  handler: (msg: AuthBroadcastMessage) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const ch = getChannel();
  const onMessage = (e: MessageEvent) => {
    const data = e.data as AuthBroadcastMessage;
    if (data && (data.type === "signout" || data.type === "expired")) handler(data);
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === SIGNOUT_LS_KEY && e.newValue) {
      handler({ type: "signout", at: Number(e.newValue) || Date.now() });
    }
  };
  ch?.addEventListener("message", onMessage);
  window.addEventListener("storage", onStorage);
  return () => {
    ch?.removeEventListener("message", onMessage);
    window.removeEventListener("storage", onStorage);
  };
}