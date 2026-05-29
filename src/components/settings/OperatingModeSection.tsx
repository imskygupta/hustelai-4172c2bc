import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, RotateCcw, Briefcase, Building2, Rocket, GraduationCap, HeartHandshake, Settings2, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { toast } from "sonner";
import {
  OPERATOR_MODES,
  useOperatorMode,
  setOperatorMode,
  type OperatorMode,
} from "@/lib/operator-mode";
import { supabase } from "@/integrations/supabase/client";

const ICON: Record<OperatorMode, React.ComponentType<{ className?: string }>> = {
  freelancer: Briefcase,
  agency: Building2,
  creator: Rocket,
  consultant: GraduationCap,
  coach: HeartHandshake,
  operator: Settings2,
  explorer: Compass,
};

/**
 * Operating Mode settings — users evolve (Freelancer → Agency etc.). Mode
 * switching is *encouraged*, not hidden. Persists to `profiles.profile_mode`
 * and flips `profile_mode_locked` to true on manual change.
 */
export default function OperatingModeSection() {
  const navigate = useNavigate();
  const { mode } = useOperatorMode();
  const [lastChangedAt, setLastChangedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("updated_at")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled) setLastChangedAt((data as { updated_at?: string } | null)?.updated_at ?? null);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [mode]);

  const pick = (m: OperatorMode) => {
    setOperatorMode(m, { lock: true, syncDb: true });
    toast.success(`Switched to ${OPERATOR_MODES.find(x => x.id === m)?.label} mode`);
  };

  const reset = () => {
    setOperatorMode(null, { lock: false, syncDb: true });
    toast.success("Recommendations reset");
    navigate("/dashboard");
  };

  const visible = OPERATOR_MODES;
  const currentLabel = mode ? OPERATOR_MODES.find(m => m.id === mode)?.label : "Not set";

  return (
    <SettingsSection
      title="Operating Mode"
      description="HustleAI adapts your dashboard, sidebar and workspace around how you work. Switch any time — none of your data moves."
    >
      <div className="grid sm:grid-cols-2 gap-2">
        {visible.map((m) => {
          const Icon = ICON[m.id];
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => pick(m.id)}
              className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                active
                  ? "border-emerald-400 bg-emerald-50/60 shadow-sm"
                  : "border-border bg-background hover:border-emerald-300 hover:bg-muted/30"
              }`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                active ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
              }`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{m.label}</span>
                <span className="block text-xs text-muted-foreground truncate">{m.tagline}</span>
              </span>
              {active && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div>
          Current: <span className="font-medium text-foreground">{currentLabel}</span>
          {lastChangedAt && (
            <span className="ml-2 opacity-70">
              · Last changed {new Date(lastChangedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={reset}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset recommendations
        </Button>
      </div>
    </SettingsSection>
  );
}