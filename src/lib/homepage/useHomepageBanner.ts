import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { HomepageVariant } from "./useActiveHomepage";

export type HomepageBannerConfig = {
  enabled: boolean;
  text: string;
  ctaText: string;
  targetVariant: HomepageVariant;
};

const CACHE_KEY = "hustleai:homepage_banner";
const DEFAULT: HomepageBannerConfig = {
  enabled: false,
  text: "✨ See the new HustleAI experience",
  ctaText: "Try V3",
  targetVariant: "v3",
};

function readCache(): HomepageBannerConfig {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

/**
 * Admin-controlled "Preview the future" banner config.
 * Synchronous initial value from sessionStorage; refreshes from DB on mount.
 */
export function useHomepageBanner(): HomepageBannerConfig {
  const [config, setConfig] = useState<HomepageBannerConfig>(() => readCache());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("homepage_variant_setting")
          .select("banner_enabled, banner_text, banner_cta_text, banner_target_variant")
          .eq("id", 1)
          .maybeSingle();
        if (cancelled || error || !data) return;
        const next: HomepageBannerConfig = {
          enabled: !!(data as any).banner_enabled,
          text: (data as any).banner_text || DEFAULT.text,
          ctaText: (data as any).banner_cta_text || DEFAULT.ctaText,
          targetVariant: ((data as any).banner_target_variant || "v3") as HomepageVariant,
        };
        setConfig(next);
        try { window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch {}
      } catch { /* keep default */ }
    })();
    return () => { cancelled = true; };
  }, []);

  return config;
}

// ------- visitor-side opt-in preference (30 day localStorage) -------

const PREF_KEY = "hustleai:homepage_preference";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type HomepagePreference = "v3" | "classic" | null;

type StoredPreference = { variant: "v3" | "classic"; until: number };

export function getHomepagePreference(): HomepagePreference {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPreference;
    if (!parsed?.until || parsed.until < Date.now()) {
      window.localStorage.removeItem(PREF_KEY);
      return null;
    }
    return parsed.variant;
  } catch {
    return null;
  }
}

export function setHomepagePreference(variant: "v3" | "classic") {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredPreference = { variant, until: Date.now() + THIRTY_DAYS_MS };
    window.localStorage.setItem(PREF_KEY, JSON.stringify(payload));
  } catch { /* no-op */ }
}

export function clearHomepagePreference() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(PREF_KEY); } catch {}
}