import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Target, MessageSquare, ChevronRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { setOperatorMode, type OperatorMode } from "@/lib/operator-mode";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

/**
 * Post-login Workspace Setup overlay.
 *
 * INVARIANTS (do not break):
 * - Renders ONLY inside the authenticated Dashboard, never during auth,
 *   email verification, or onboarding.
 * - Self-dismisses when profile.setup_completed === true.
 * - Skipped if the user has not yet completed legacy onboarding
 *   (let Onboarding finish first; this is the *next* layer, not a replacement).
 * - 3 questions, 30 seconds, no wizard, no route change.
 * - Saves: profile_mode (re-uses operator-mode infra so the dashboard re-ranks
 *   immediately), primary_goal, preferred_channel, setup_completed.
 */

const MODE_OPTIONS: { id: OperatorMode; label: string; hint: string }[] = [
  { id: "freelancer", label: "Freelancer",  hint: "Solo, client-by-client" },
  { id: "agency",     label: "Agency",      hint: "Team, multiple clients" },
  { id: "creator",    label: "Creator",     hint: "Content & audience" },
  { id: "consultant", label: "Consultant",  hint: "Discovery → strategy" },
  { id: "coach",      label: "Coach",       hint: "1:1 programs & cohorts" },
  { id: "operator",   label: "Other",       hint: "Generalist operator" },
];

const GOAL_OPTIONS = [
  { id: "find_clients",     label: "Find clients" },
  { id: "manage_clients",   label: "Manage clients" },
  { id: "deliver_projects", label: "Deliver projects" },
  { id: "create_content",   label: "Create content" },
  { id: "build_automations",label: "Build automations" },
] as const;

const CHANNEL_OPTIONS = [
  { id: "whatsapp",     label: "WhatsApp" },
  { id: "telegram",     label: "Telegram" },
  { id: "email",        label: "Email" },
  { id: "notion",       label: "Notion" },
  { id: "spreadsheets", label: "Spreadsheets" },
] as const;

type Step = 1 | 2 | 3;

export function SetupOverlay() {
  const { user, profile, refreshProfile, loading, profileLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<OperatorMode | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [channel, setChannel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Eligibility: signed in, profile loaded, onboarding done, setup not done.
  const eligible = useMemo(() => {
    if (loading || profileLoading) return false;
    if (!user || !profile) return false;
    if (!profile.onboarding_completed) return false;        // let legacy onboarding finish first
    if ((profile as any).setup_completed) return false;     // already done
    return true;
  }, [user, profile, loading, profileLoading]);

  useEffect(() => {
    if (!eligible) { setOpen(false); return; }
    // Tiny delay so the dashboard paints first — overlay feels like a welcome,
    // not an interception.
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, [eligible]);

  useEffect(() => {
    if (open) void trackEvent("setup_overlay_opened", { surface: "dashboard" });
  }, [open]);

  const canAdvance = (step === 1 && mode) || (step === 2 && goal) || (step === 3 && channel);

  const next = () => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else void save();
  };

  const save = async () => {
    if (!user || !mode || !goal || !channel) return;
    setSaving(true);
    try {
      // Persist primary_goal / preferred_channel / setup_completed
      const { error } = await supabase
        .from("profiles")
        .update({
          primary_goal: goal,
          preferred_channel: channel,
          setup_completed: true,
        } as never)
        .eq("user_id", user.id);
      if (error) throw error;

      // Persona — reuse the operator-mode infra so the dashboard re-ranks now.
      // syncDb=true also writes profile_mode + locks it.
      setOperatorMode(mode, { lock: true, syncDb: true });

      void trackEvent("setup_overlay_completed", {
        surface: "dashboard",
        metadata: { mode, goal, channel },
      });
      void trackEvent("persona_selected", {
        surface: "dashboard",
        metadata: { persona: mode, goal, channel },
      });

      await refreshProfile?.();
      toast.success("Workspace tailored to your goals");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Could not save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const StepIcon = step === 1 ? Sparkles : step === 2 ? Target : MessageSquare;
  const stepTitle =
    step === 1 ? "What best describes your work?" :
    step === 2 ? "What's your main goal right now?" :
                 "How do you work today?";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !saving) { /* prevent dismiss; opt-in only */ } }}>
      <DialogContent className="sm:max-w-lg [&>button.absolute]:hidden">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <StepIcon className="h-3.5 w-3.5 text-emerald-500" />
            Welcome to HustleAI · 30 seconds to tailor your workspace
          </div>
          <DialogTitle className="text-xl">{stepTitle}</DialogTitle>
          <DialogDescription>
            Step {step} of 3 · We use this to rank your dashboard. Nothing is hidden.
          </DialogDescription>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 -mt-1">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < step ? "bg-emerald-500" :
                i === step ? "bg-emerald-500/60" :
                "bg-border/40"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            {MODE_OPTIONS.map(opt => {
              const active = mode === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setMode(opt.id)}
                  className={`text-left rounded-lg border p-3 transition-all ${
                    active
                      ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30"
                      : "border-border/50 hover:border-emerald-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{opt.label}</span>
                    {active && <Check className="h-4 w-4 text-emerald-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{opt.hint}</p>
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2 pt-2">
            {GOAL_OPTIONS.map(opt => {
              const active = goal === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setGoal(opt.id)}
                  className={`w-full flex items-center justify-between rounded-lg border p-3 transition-all ${
                    active
                      ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30"
                      : "border-border/50 hover:border-emerald-500/30"
                  }`}
                >
                  <span className="font-medium text-sm">{opt.label}</span>
                  {active && <Check className="h-4 w-4 text-emerald-500" />}
                </button>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            {CHANNEL_OPTIONS.map(opt => {
              const active = channel === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setChannel(opt.id)}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
                    active
                      ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30"
                      : "border-border/50 hover:border-emerald-500/30"
                  }`}
                >
                  <span className="font-medium text-sm">{opt.label}</span>
                  {active && <Check className="h-4 w-4 text-emerald-500" />}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-3">
          <button
            type="button"
            onClick={() => step > 1 && setStep((step - 1) as Step)}
            disabled={step === 1 || saving}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            ← Back
          </button>
          <Button onClick={next} disabled={!canAdvance || saving} size="sm" className="min-w-28">
            {saving ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving…</>
            ) : step === 3 ? (
              <>Finish <Check className="h-3.5 w-3.5 ml-1.5" /></>
            ) : (
              <>Continue <ChevronRight className="h-3.5 w-3.5 ml-1" /></>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SetupOverlay;