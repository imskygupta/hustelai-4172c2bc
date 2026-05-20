// Realtime / Event Fabric DB client (Phase 7D).
//
// Project: qeswhaytgvosfzzgraef.
// Repurposed from "community" → realtime isolation + websocket fanout +
// live collaboration + notification fanout buffers. Still hosts the existing
// forum/chat/votes/discord-link tables since those are realtime social
// workloads and belong on this fabric.
//
// DO NOT route AI queues, admin telemetry, billing, or blog/CMS data here.
// Auth + identity stay on the primary Lovable Cloud client; pass user_id
// explicitly when writing.
import { createClient } from "@supabase/supabase-js";

const URL = "https://qeswhaytgvosfzzgraef.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_MfXLYdThZHM45f6V9DyNsw_ADD2HqIv";

export const realtimeDb = createClient(URL, PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: "hustlai-realtime-anon", // separate from primary + workspace clients
  },
});

console.info("Realtime DB connected");

// Back-compat alias. Existing call sites keep working; new code should use
// `realtimeDb`. Slated for removal once all imports are migrated.
export const communityDb = realtimeDb;

export type DiscordLink = {
  id: string;
  user_id: string;
  discord_user_id: string;
  discord_username: string | null;
  discord_avatar: string | null;
  discord_connected_at: string;
  discord_role_synced_at: string | null;
};