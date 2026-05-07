// HustleAI API Platform — 5th Supabase client.
// Read-only, anon access. Used for the public endpoint catalog and (via
// edge functions) for workspace/key/usage data. NEVER mix with primary
// auth/billing, Workspace OS, community, or Docs DBs.
import { createClient } from "@supabase/supabase-js";

const URL = "https://larncwugkdclkhayfjle.supabase.co";
// Anon key is publishable. Real writes happen server-side via the
// api-platform edge function using SERVICE_ROLE.
const ANON_KEY =
  "sb_publishable_REPLACE_WITH_API_PLATFORM_ANON";

export const apiPlatformDb = createClient(URL, ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: "hustlai-api-anon",
  },
});

export type ApiEndpoint = {
  id: string;
  slug: string;
  name: string;
  method: string;
  path: string;
  version: string;
  model_route: "hustle-fast" | "hustle-logic" | "hustle-omni" | "hustle-research";
  status: "ga" | "beta" | "deprecated";
  description: string | null;
};

export async function listPublicEndpoints(): Promise<ApiEndpoint[]> {
  const { data, error } = await apiPlatformDb
    .from("api_endpoints")
    .select("*")
    .eq("is_public", true)
    .order("slug");
  if (error) return [];
  return (data as any) ?? [];
}