import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { useHomepageBanner, setHomepagePreference } from "@/lib/homepage/useHomepageBanner";
import { logEvent } from "@/integrations/analytics/client";

const DISMISS_KEY = "hustleai:homepage_banner_dismissed_at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function wasRecentlyDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const ts = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    return ts > 0 && Date.now() - ts < DISMISS_TTL_MS;
  } catch { return false; }
}

/**
 * Subtle "Preview the future" pill rendered on the production homepage.
 * Admin-controlled (enabled/text/CTA/target variant). Tracks impression + click
 * via the existing log-event pipeline. Dismissed locally for 7 days.
 */
export function HomepageDiscoveryBanner() {
  const navigate = useNavigate();
  const config = useHomepageBanner();
  const [visible, setVisible] = useState(false);
  const [impressionLogged, setImpressionLogged] = useState(false);

  useEffect(() => {
    if (!config.enabled) { setVisible(false); return; }
    if (wasRecentlyDismissed()) { setVisible(false); return; }
    setVisible(true);
  }, [config.enabled]);

  useEffect(() => {
    if (!visible || impressionLogged) return;
    setImpressionLogged(true);
    void logEvent("homepage_experiment", "homepage_banner_impression", {
      variant: config.targetVariant,
      source: "banner",
      page: typeof window !== "undefined" ? window.location.pathname : "/",
    });
  }, [visible, impressionLogged, config.targetVariant]);

  if (!visible) return null;

  const targetPath = `/homepage-${config.targetVariant.replace("v", "")}`;

  const handleTry = () => {
    setHomepagePreference("v3");
    void logEvent("homepage_experiment", "homepage_banner_click", {
      variant: config.targetVariant,
      source: "banner",
      page: typeof window !== "undefined" ? window.location.pathname : "/",
    });
    navigate(targetPath);
  };

  const handleDismiss = () => {
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setVisible(false);
    void logEvent("homepage_experiment", "homepage_banner_dismiss", {
      variant: config.targetVariant, source: "banner",
    });
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-3 w-full max-w-[640px] pointer-events-none">
      <div className="pointer-events-auto rounded-full border border-slate-200/80 bg-white/90 backdrop-blur-md shadow-lg shadow-slate-900/5 flex items-center gap-2 pl-3 pr-1 py-1 text-xs animate-in fade-in slide-in-from-top-2 duration-500">
        <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span className="text-slate-700 truncate flex-1 min-w-0">{config.text}</span>
        <button
          onClick={handleTry}
          className="shrink-0 inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-full px-3 py-1 transition-colors"
        >
          {config.ctaText}
          <ArrowRight className="w-3 h-3" />
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="shrink-0 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}