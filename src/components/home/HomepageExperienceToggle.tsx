import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { setHomepagePreference } from "@/lib/homepage/useHomepageBanner";
import { logEvent } from "@/integrations/analytics/client";

/**
 * Floating Classic ↔ New toggle shown while viewing an experimental homepage.
 * Persists the visitor's choice for 30 days and routes to `/` for the classic
 * side. Tracks toggle events through the analytics pipeline.
 */
export function HomepageExperienceToggle({
  variant = "v3",
}: {
  variant?: "v3";
}) {
  const navigate = useNavigate();
  const [active, setActive] = useState<"classic" | "new">("new");

  useEffect(() => {
    void logEvent("homepage_experiment", "homepage_v3_view", {
      variant,
      source: "toggle",
      page: typeof window !== "undefined" ? window.location.pathname : "/homepage-3",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goClassic = () => {
    if (active === "classic") return;
    setActive("classic");
    setHomepagePreference("classic");
    void logEvent("homepage_experiment", "homepage_v3_toggle_to_classic", {
      variant, source: "toggle",
    });
    navigate("/");
  };

  const stayNew = () => {
    if (active === "new") return;
    setActive("new");
    setHomepagePreference("v3");
    void logEvent("homepage_experiment", "homepage_v3_toggle_to_new", {
      variant, source: "toggle",
    });
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 select-none">
      <div className="rounded-full bg-black/80 backdrop-blur-md border border-white/10 shadow-2xl shadow-black/50 p-1 flex items-center text-xs font-medium">
        <button
          onClick={goClassic}
          className={`px-3 py-1.5 rounded-full transition-colors ${
            active === "classic"
              ? "bg-white text-slate-900"
              : "text-white/70 hover:text-white"
          }`}
        >
          Classic
        </button>
        <button
          onClick={stayNew}
          className={`px-3 py-1.5 rounded-full inline-flex items-center gap-1 transition-colors ${
            active === "new"
              ? "bg-emerald-500 text-white"
              : "text-white/70 hover:text-white"
          }`}
        >
          <Sparkles className="w-3 h-3" /> New
        </button>
      </div>
    </div>
  );
}