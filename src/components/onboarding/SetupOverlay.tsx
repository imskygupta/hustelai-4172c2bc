import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Target, MessageSquare, ChevronRight, Check, ArrowRight, PartyPopper } from "lucide-react";
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

type Step = 1 | 2 | 3 | 4;

interface NextStep {
  href: string;
  label: string;
  blurb: string;
}

/**
 * Resolve the single "Recommended next step" handoff.
 * Goal wins where it maps cleanly; otherwise we fall back to persona.
 * One button, one place — never a tour.
 */
function resolveNextStep(mode: OperatorMode, goal: string): NextStep {
  const byGoal: Record<string, NextStep> = {
    find_clients:      { href: "/explore",                   label: "Find your first opportunity", blurb: "Browse leads & briefs hand-picked for you." },
    manage_clients:    { href: "/clients",                   label: "Add your first client",        blurb: "Your CRM is ready — drop in a real client." },
    deliver_projects:  { href: "/dashboard/workspace-os",    label: "Open your workspace",          blurb: "Spin up a project with starter tasks." },
    create_content:    { href: "/tools/content-calendar",    label: "Plan your content week",       blurb: "AI-fills a 7-day calendar in seconds." },
    build_automations: { href: "/automations",               label: "Build your first automation",  blurb: "Hand off the repetitive parts to bots." },
  };
  if (byGoal[goal]) return byGoal[goal];

  const byMode: Record<OperatorMode, NextStep> = {
    freelancer: { href: "/tools/proposal-generator", label: "Create your first proposal",   blurb: "Turn a brief into a sendable proposal." },
    agency:     { href: "/clients",                  label: "Add your first client",        blurb: "Set up your roster before pipelines." },
    creator:    { href: "/tools/content-calendar",   label: "Plan your content week",       blurb: "Map a 7-day publishing rhythm." },
    consultant: { href: "/workspaces/intake",        label: "Set up your discovery form",   blurb: "Capture leads with a branded intake form." },
    coach:      { href: "/workspaces/intake",        label: "Set up your discovery form",   blurb: "Take applications from your community." },
    operator:   { href: "/dashboard/workspace-os",   label: "Open your workspace",          blurb: "See the whole operation in one view." },
    explorer:   { href: "/explore",                  label: "Explore the catalogue",        blurb: "See what HustleAI can do today." },
  };
  return byMode[mode];
}

const MODE_LABEL: Record<OperatorMode, string> = {
  freelancer: "a Freelancer",
  agency: "an Agency",
  creator: "a Creator",
  consultant: "a Consultant",
  coach: "a Coach",
  operator: "an Operator",
  explorer: "an Explorer",
};

export function SetupOverlay() {
  const { user, profile, refreshProfile, loading, profileLoading } = useAuth();
  const navigate = useNavigate();
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
    else if (step === 3) void save();
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
      // Hand off to the persona-aware "Recommended next step" screen.
      setStep(4);
    } catch (e: any) {
      toast.error(e?.message || "Could not save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const StepIcon =
    step === 1 ? Sparkles :
    step === 2 ? Target :
    step === 3 ? MessageSquare :
                 PartyPopper;
  const stepTitle =
    step === 1 ? "What best describes your work?" :
    step === 2 ? "What's your main goal right now?" :
    step === 3 ? "How do you work today?" :
                 `You're set. HustleAI is tailored for ${mode ? MODE_LABEL[mode] : "you"}.`;

  const nextStep = step === 4 && mode && goal ? resolveNextStep(mode, goal) : null;
  const handoff = () => {
    if (!nextStep) return;
    void trackEvent("setup_handoff_clicked", {
      surface: "dashboard",
      metadata: { mode, goal, channel, to: nextStep.href },
    });
    setOpen(false);
    navigate(nextStep.href);
  };
  const skipHandoff = () => {
    void trackEvent("setup_handoff_skipped", {
      surface: "dashboard",
      metadata: { mode, goal, channel },
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !saving) { /* prevent dismiss; opt-in only */ } }}>
      <DialogContent className="sm:max-w-lg [&>button.absolute]:hidden">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <StepIcon className="h-3.5 w-3.5 text-emerald-500" />
            {step === 4 ? "Recommended next step" : "Welcome to HustleAI · 30 seconds to tailor your workspace"}
          </div>
          <DialogTitle className="text-xl">{stepTitle}</DialogTitle>
          <DialogDescription>
            {step === 4
              ? "One clear next step. Take it now or do it later — your dashboard is already ranked for you."
              : `Step ${step} of 3 · We use this to rank your dashboard. Nothing is hidden.`}
          </DialogDescription>
        </DialogHeader>

        {/* Progress dots — hidden on the handoff screen */}
        {step !== 4 && (
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
        )}

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

        {step === 4 && nextStep && (
          <div className="space-y-3 pt-2">
            <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-violet-500/5 p-4">
              <div className="text-xs uppercase tracking-widest text-emerald-500 mb-1">Start here</div>
              <div className="text-base font-semibold">{nextStep.label}</div>
              <p className="text-sm text-muted-foreground mt-1">{nextStep.blurb}</p>
              <Button onClick={handoff} className="mt-3 w-full" size="lg">
                {nextStep.label}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
            <button
              type="button"
              onClick={skipHandoff}
              className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              I'll explore on my own
            </button>
          </div>
        )}

        {step !== 4 && (
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
        )}
      </DialogContent>
    </Dialog>
  );
}

export default SetupOverlay;