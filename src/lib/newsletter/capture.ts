import { blogDb } from "@/integrations/blog/db";
import { supabase } from "@/integrations/supabase/client";

const ANON_KEY = "nlc:anon";
const DISMISS_KEY = (surface: string) => `nlc:dismissed:${surface}`;
const SUBSCRIBED_KEY = "nlc:subscribed";
const NEVER_KEY = "nlc:never";
const DISMISS_TTL_DAYS = 90;

export function getAnonId(): string {
  try {
    let v = localStorage.getItem(ANON_KEY);
    if (!v) {
      v = (crypto as any).randomUUID?.() || `a_${Math.random().toString(36).slice(2)}_${Date.now()}`;
      localStorage.setItem(ANON_KEY, v);
    }
    return v;
  } catch { return "anon"; }
}

export function isDismissed(surface: string): boolean {
  try {
    if (localStorage.getItem(NEVER_KEY) === "1") return true;
    const raw = localStorage.getItem(DISMISS_KEY(surface));
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return true;
    return Date.now() - ts < DISMISS_TTL_DAYS * 86400_000;
  } catch { return true; }
}

export function markDismissed(surface: string) {
  try { localStorage.setItem(DISMISS_KEY(surface), String(Date.now())); } catch {}
  // Best-effort server log (ignore failures)
  void blogDb.from("newsletter_capture_dismissals" as any).insert({
    anon_id: getAnonId(), surface,
  } as any);
}

export function markNeverShow() {
  try {
    localStorage.setItem(NEVER_KEY, "1");
    localStorage.setItem(DISMISS_KEY("popup"), String(Date.now()));
  } catch {}
}

export function isNeverShow(): boolean {
  try { return localStorage.getItem(NEVER_KEY) === "1"; } catch { return false; }
}

export function isSubscribed(): boolean {
  try { return localStorage.getItem(SUBSCRIBED_KEY) === "1"; } catch { return false; }
}

export function markSubscribed() {
  try { localStorage.setItem(SUBSCRIBED_KEY, "1"); } catch {}
}

export async function subscribe(input: { email: string; source: string; name?: string }) {
  const { data, error } = await supabase.functions.invoke("newsletter-subscribe", { body: input });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  markSubscribed();
  return data;
}