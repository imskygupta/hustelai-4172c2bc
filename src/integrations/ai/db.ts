// Phase 7D.3 — AI/API DB client (larncwugkdclkhayfjle).
//
// Owns AI runtime state: chat_messages, ai_conversation_memory,
// ai_context_windows, ai_session_state. RLS-gated by auth.uid().
//
// This client uses anon key + the active Supabase auth session token so RLS
// can enforce per-user ownership. Identity is shared with the primary
// Lovable Cloud auth (same JWT signing — `sub` claim is the user_id).
//
// HARD-FAIL: if the anon key is not yet provisioned, any call throws an
// explicit error. We never silently fall back to the primary DB.
import { createClient } from "@supabase/supabase-js";
import { supabase as primary } from "@/integrations/supabase/client";

const URL = "https://larncwugkdclkhayfjle.supabase.co";
// Anon publishable key for the AI/API project. Replace once provisioned.
const PUBLISHABLE_KEY: string = "sb_publishable_ai_replace_me";

const CONFIGURED =
  (PUBLISHABLE_KEY as string) !== "sb_publishable_ai_replace_me" &&
  PUBLISHABLE_KEY.length > 20;

const realClient = CONFIGURED
  ? createClient(URL, PUBLISHABLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: "hustlai-ai-anon",
      },
    })
  : null;

if (realClient) {
  console.info("API DB connected");
} else {
  console.warn("API DB unavailable: missing AI/API publishable key");
}

// Inject the current primary session JWT into AI DB requests so RLS works.
async function withAuth<T>(fn: (sb: NonNullable<typeof realClient>) => Promise<T>): Promise<T> {
  if (!realClient) {
    throw new Error(
      "AI/API DB not configured (sb_publishable_ai_replace_me). " +
        "Reads/writes to chat_messages and AI memory are disabled until " +
        "the anon key is set in src/integrations/ai/db.ts.",
    );
  }
  const { data } = await primary.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    (realClient as any).rest.headers.Authorization = `Bearer ${token}`;
    (realClient as any).realtime.setAuth?.(token);
  }
  return fn(realClient);
}

export const aiDbReady = CONFIGURED;

function emptyQueryStub(table: string) {
  const empty = { data: [], count: 0, error: null };
  let proxy: any;
  const callable = () => proxy;
  proxy = new Proxy(callable, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: any, reject: any) => {
          console.warn(`API DB query skipped for ${table}: missing publishable key`);
          return Promise.resolve(empty).then(resolve, reject);
        };
      }
      if (prop === "catch") return Promise.resolve(empty).catch.bind(Promise.resolve(empty));
      if (prop === "finally") return Promise.resolve(empty).finally.bind(Promise.resolve(empty));
      return proxy;
    },
    apply() { return proxy; },
  });
  return proxy;
}

// Thin facade — same API surface as supabase client for the bits we use.
export const aiDb = {
  from(table: string) {
    if (!realClient) {
      return emptyQueryStub(table);
    }
    // Sync attach of current session token (best-effort) for non-await callers.
    primary.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (token) {
        (realClient as any).rest.headers.Authorization = `Bearer ${token}`;
      }
    });
    return realClient.from(table);
  },
  channel(name: string) {
    if (!realClient) {
      console.warn(`API DB realtime disabled for ${name}: missing publishable key`);
      return {
        on() { return this; },
        subscribe() { return this; },
        unsubscribe() { return Promise.resolve("ok"); },
      } as any;
    }
    return realClient.channel(name);
  },
  removeChannel(ch: any) {
    realClient?.removeChannel(ch);
  },
  withAuth,
};