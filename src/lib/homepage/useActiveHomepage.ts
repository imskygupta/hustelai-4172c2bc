import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HomepageVariant = "v1" | "v2" | "v3" | "v4";

const CACHE_KEY = "hustleai:active_homepage";
const ALLOWED: HomepageVariant[] = ["v1", "v2", "v3", "v4"];

function readCache(): HomepageVariant {
  if (typeof window === "undefined") return "v1";
  const cached = window.sessionStorage.getItem(CACHE_KEY) as HomepageVariant | null;
  return cached && ALLOWED.includes(cached) ? cached : "v1";
}

/**
 * Reads `homepage_variant_setting.active_variant` for `/`.
 * - Synchronous initial value from sessionStorage (no flash for repeat visits).
 * - Defaults to "v1" on first visit or any failure — the live homepage never breaks.
 */
export function useActiveHomepage(): HomepageVariant {
  const [variant, setVariant] = useState<HomepageVariant>(() => readCache());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("homepage_variant_setting")
          .select("active_variant")
          .eq("id", 1)
          .maybeSingle();
        if (cancelled || error || !data) return;
        const next = (data.active_variant as HomepageVariant) ?? "v1";
        if (ALLOWED.includes(next)) {
          setVariant(next);
          try { window.sessionStorage.setItem(CACHE_KEY, next); } catch {}
        }
      } catch {
        /* keep cached/default value */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return variant;
}

export async function setActiveHomepageVariant(variant: HomepageVariant) {
  const { error } = await supabase
    .from("homepage_variant_setting")
    .update({ active_variant: variant })
    .eq("id", 1);
  if (error) throw error;
  try { window.sessionStorage.setItem(CACHE_KEY, variant); } catch {}
}