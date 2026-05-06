// Tertiary Supabase client — community / forum / discord-link data only.
// Auth, profiles, billing stay on the primary Lovable Cloud client.
// User identity is taken from the primary client's auth.uid() and passed in
// as `user_id` (same pattern as the Work Hub secondary DB).
import { createClient } from "@supabase/supabase-js";

const URL = "https://qeswhaytgvosfzzgraef.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_MfXLYdThZHM45f6V9DyNsw_ADD2HqIv";

export const communityDb = createClient(URL, PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: "hustlai-community-anon", // separate from primary + workspace clients
  },
});

export type DiscordLink = {
  id: string;
  user_id: string;
  discord_user_id: string;
  discord_username: string | null;
  discord_avatar: string | null;
  discord_connected_at: string;
  discord_role_synced_at: string | null;
};