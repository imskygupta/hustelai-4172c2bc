import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Target, MessageSquare, Check, ArrowRight, ArrowLeft, Loader2,
  FolderKanban, ListChecks, PenSquare, Inbox, FileBox, Workflow,
  Rocket, Compass, Upload, UserPlus, Zap, LayoutDashboard, History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { setOperatorMode, type OperatorMode } from "@/lib/operator-mode";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { toast } from "sonner";

/**
 * /start — single, guided launcher that replaces both legacy /onboarding and
 * the post-login SetupOverlay. Four steps, ~90 seconds, then drops the user
 * into /dashboard. Reuses the SetupOverlay data model verbatim (mode / goal /
 * channel → profile_mode + primary_goal + preferred_channel + setup_completed
 * + onboarding_completed) so nothing downstream needs to change.
 */

const MODES: { id: OperatorMode; label: string; hint: string }[] = [
  { id: "freelancer", label: "Freelance",        hint: "Solo, client-by-client" },
  { id: "agency",     label: "Agency",           hint: "Team, multiple clients" },
  { id: "creator",    label: "Creator",          hint: "Content & audience" },
  { id: "consultant", label: "Consultant",       hint: "Discovery → strategy" },
  { id: "coach",      label: "Coach",            hint: "1:1 programs & cohorts" },
  { id: "operator",   label: "Personal / Other", hint: "Generalist operator" },
];

const GOALS = [
  { id: "find_clients",      label: "Find clients" },
  { id: "manage_clients",    label: "Manage clients" },
  { id: "deliver_projects",  label: "Deliver projects" },
  { id: "create_content",    label: "Create content" },
  { id: "build_automations", label: "Build automations" },
] as const;

const CHANNELS = [
  { id: "whatsapp",     label: "WhatsApp" },
  { id: "telegram",     label: "Telegram" },
  { id: "email",        label: "Email" },
  { id: "notion",       label: "Notion" },
  { id: "spreadsheets", label: "Spreadsheets" },
] as const;

const TOUR = [
  { icon: FolderKanban, title: "Projects",    desc: "Run client work end-to-end — briefs, tasks, deliverables." },
  { icon: ListChecks,   title: "Tasks",       desc: "Your daily focus list, synced across every workspace." },
  { icon: PenSquare,    title: "Canvas",      desc: "Plan, write and design with AI in a free-form whiteboard." },
  { icon: Inbox,        title: "Inbox",       desc: "Messages from clients, signals from automations — all here." },
  { icon: FileBox,      title: "Files",       desc: "One storage for proposals, contracts, assets, exports." },
  { icon: Workflow,     title: "Automations", desc: "Hand off the repetitive parts to background workers." },
];

const ACTIONS = [
  { icon: Rocket,    title: "Create your first project", desc: "Spin up a workspace with starter tasks.", href: "/projects/new" },
  { icon: PenSquare, title: "Open Canvas",               desc: "Brainstorm with AI on a blank canvas.",   href: "/canvas" },
  { icon: Upload,    title: "Upload your first file",    desc: "Drop a brief, contract or asset.",         href: "/dashboard?tab=files" },
  { icon: UserPlus,  title: "Invite a teammate",         desc: "Bring a collaborator into your workspace.", href: "/settings/workspace" },
];

type Step = 1 | 2 | 3 | 4;

export default function Start() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<OperatorMode | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [channel, setChannel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // /start is the Workspace Hub. First-time users (onboarding_completed=false)
  // get the full guided 4-step wizard. Returning users get a lightweight hub
  // — no questionnaire, no redirect — so they can re-enter the workspace,
  // resume recent work, or trigger a quick action.
  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/login?next=%2Fstart", { replace: true });
  }, [loading, user, navigate]);

  const isReturning = !!profile?.onboarding_completed;

  useEffect(() => {
    void trackEvent("start_page_view", {
      surface: "start",
      metadata: { step, mode: isReturning ? "hub" : "wizard" },
    });
  }, [step, isReturning]);

  const canAdvance = useMemo(() => {
    if (step === 1) return !!mode && !!goal && !!channel;
    return true;
  }, [step, mode, goal, channel]);

  async function persistAndFinish(navigateTo: string) {
    if (!user) return;
    setSaving(true);
    try {
      const update: Record<string, unknown> = {
        onboarding_completed: true,
        start_completed_at: new Date().toISOString(),
      };
      if (mode) {
        // Reuse operator-mode infra so dashboard re-ranks immediately.
        setOperatorMode(mode, { lock: true, syncDb: true });
      }
      if (goal) update.primary_goal = goal;
      if (channel) update.preferred_channel = channel;
      if (mode && goal && channel) update.setup_completed = true;

      const { error } = await supabase
        .from("profiles")
        .update(update as never)
        .eq("user_id", user.id);
      if (error) throw error;

      void trackEvent("start_completed", {
        surface: "start",
        metadata: { mode, goal, channel, skipped: !(mode && goal && channel) },
      });
      if (mode) {
        void trackEvent("persona_selected", {
          surface: "start",
          metadata: { persona: mode, goal, channel },
        });
      }
      await refreshProfile?.();
      navigate(navigateTo, { replace: true });
    } catch (e: any) {
      toast.error(e?.message || "Could not save your setup");
    } finally {
      setSaving(false);
    }
  }

  function skipAll() {
    void trackEvent("start_skipped", { surface: "start", metadata: { step } });
    void persistAndFinish("/dashboard");
  }

  function next() {
    if (step < 4) setStep((step + 1) as Step);
  }

  function back() {
    if (step > 1) setStep((step - 1) as Step);
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Returning-user lightweight hub.
  if (isReturning) {
    return <WorkspaceHub displayName={profile?.display_name || user.email?.split("@")[0] || "there"} />;
  }

  const stepMeta = [
    { tag: "Quick setup",     title: "Tell us how you work",        icon: Sparkles },
    { tag: "Your workspace",  title: "Here's what lives inside",    icon: Compass },
    { tag: "First moves",     title: "Pick a starting action",      icon: Target },
    { tag: "Ready",           title: "Your workspace is ready",     icon: Rocket },
  ][step - 1];
  const StepIcon = stepMeta.icon;

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_50%_-10%,hsl(var(--primary)/0.08),transparent_60%)] bg-background">
      <SEO title="Set up your workspace — HustleAI" description="Personalize your HustleAI workspace in under two minutes." path="/start" noindex />

      {/* Top bar */}
      <header className="border-b border-border/40 bg-background/60 backdrop-blur">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 rounded-md bg-gradient-to-br from-emerald-500 to-violet-500 items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </span>
            <span className="font-semibold tracking-tight text-sm">HustleAI</span>
          </div>
          <button
            onClick={skipAll}
            disabled={saving}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            Skip for now
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 sm:px-8 py-8 sm:py-14">
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i < step ? "bg-emerald-500"
                : i === step ? "bg-emerald-500/60"
                : "bg-border/40"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
          <StepIcon className="h-3.5 w-3.5 text-emerald-500" />
          {stepMeta.tag} · Step {step} of 4
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
          {stepMeta.title}
        </h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-xl">
          {step === 1 && "We use this to rank your dashboard, pick recommended tools, and prefill the right templates. Nothing is hidden."}
          {step === 2 && "HustleAI is one workspace for client work. These modules are always one click away from your sidebar."}
          {step === 3 && "Pick what you want to do first — you can come back to the others anytime."}
          {step === 4 && "Your workspace is tailored. Jump into the dashboard whenever you're ready."}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {step === 1 && (
              <div className="space-y-7">
                <Section label="What best describes your work?" icon={Sparkles}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {MODES.map(o => (
                      <SelectCard
                        key={o.id}
                        active={mode === o.id}
                        onClick={() => setMode(o.id)}
                        title={o.label}
                        hint={o.hint}
                      />
                    ))}
                  </div>
                </Section>
                <Section label="What's your main goal right now?" icon={Target}>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {GOALS.map(o => (
                      <SelectRow
                        key={o.id}
                        active={goal === o.id}
                        onClick={() => setGoal(o.id)}
                        label={o.label}
                      />
                    ))}
                  </div>
                </Section>
                <Section label="How do you work with clients today?" icon={MessageSquare}>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {CHANNELS.map(o => (
                      <SelectRow
                        key={o.id}
                        active={channel === o.id}
                        onClick={() => setChannel(o.id)}
                        label={o.label}
                      />
                    ))}
                  </div>
                </Section>
              </div>
            )}

            {step === 2 && (
              <div className="grid sm:grid-cols-2 gap-3">
                {TOUR.map(t => {
                  const Icon = t.icon;
                  return (
                    <div
                      key={t.title}
                      className="rounded-xl border border-border/50 bg-card/40 p-4 hover:border-emerald-500/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="inline-flex h-7 w-7 rounded-md bg-emerald-500/10 text-emerald-600 items-center justify-center">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="text-sm font-medium">{t.title}</div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {step === 3 && (
              <div className="grid sm:grid-cols-2 gap-3">
                {ACTIONS.map(a => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.title}
                      type="button"
                      onClick={() => void persistAndFinish(a.href)}
                      disabled={saving}
                      className="text-left rounded-xl border border-border/50 bg-card/40 p-4 hover:border-emerald-500/50 hover:bg-emerald-500/[0.03] transition-all disabled:opacity-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500/15 to-violet-500/10 items-center justify-center">
                            <Icon className="h-4 w-4 text-emerald-600" />
                          </span>
                          <div>
                            <div className="text-sm font-semibold tracking-tight">{a.title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{a.desc}</div>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground mt-1.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {step === 4 && (
              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-violet-500/5 p-6 sm:p-8">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-600 mb-2">
                  <Check className="h-3.5 w-3.5" /> All set
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                  Your workspace is ready{mode ? `, tailored for ${MODES.find(m => m.id === mode)?.label.toLowerCase()}` : ""}.
                </h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                  Your dashboard is ranked for your goal. You'll find Projects, Canvas, Inbox and the rest in the sidebar — always one click away.
                </p>
                <Button
                  size="lg"
                  className="mt-5"
                  disabled={saving}
                  onClick={() => void persistAndFinish("/dashboard")}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Enter workspace
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer nav */}
        {step !== 4 && step !== 3 && (
          <div className="flex items-center justify-between mt-10">
            <Button
              variant="ghost"
              size="sm"
              disabled={step === 1 || saving}
              onClick={back}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
            <Button
              size="sm"
              disabled={!canAdvance || saving}
              onClick={next}
              className="min-w-32"
            >
              Continue <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        )}
        {step === 3 && (
          <div className="flex items-center justify-between mt-10">
            <Button variant="ghost" size="sm" onClick={back} disabled={saving} className="text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
            <Button size="sm" onClick={next} disabled={saving}>
              Skip — just enter workspace <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function Section({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
        <Icon className="h-3 w-3 text-emerald-500" /> {label}
      </div>
      {children}
    </div>
  );
}

function SelectCard({ active, onClick, title, hint }: { active: boolean; onClick: () => void; title: string; hint: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-lg border p-3 transition-all ${
        active
          ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30"
          : "border-border/50 hover:border-emerald-500/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        {active && <Check className="h-3.5 w-3.5 text-emerald-500" />}
      </div>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </button>
  );
}

function SelectRow({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-all ${
        active
          ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30"
          : "border-border/50 hover:border-emerald-500/40"
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      {active && <Check className="h-3.5 w-3.5 text-emerald-500" />}
    </button>
  );
}

/* ───────────────────────── Workspace Hub (returning users) ───────────────── */

const HUB_QUICK_ACTIONS = [
  { icon: Rocket,    title: "New project",       desc: "Spin up a fresh workspace.",          href: "/projects/new" },
  { icon: PenSquare, title: "Open Canvas",       desc: "Brainstorm on the AI canvas.",        href: "/canvas" },
  { icon: Upload,    title: "Upload a file",     desc: "Drop a brief, contract or asset.",    href: "/dashboard?tab=files" },
  { icon: UserPlus,  title: "Invite a teammate", desc: "Bring someone into your workspace.",  href: "/settings/workspace" },
];

const HUB_RECOMMENDED = [
  { icon: Sparkles, title: "AI assistant",    desc: "Draft, summarize, plan.",     href: "/hustlebot" },
  { icon: Compass,  title: "Explore toolkit", desc: "All AI tools & templates.",   href: "/ai-tools" },
  { icon: Workflow, title: "Automations",     desc: "Hand off the repetitive.",    href: "/automations" },
];

function WorkspaceHub({ displayName }: { displayName: string }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_50%_-10%,hsl(var(--primary)/0.06),transparent_60%)] bg-background">
      <SEO title="Workspace Hub — HustleAI" description="Your HustleAI workspace hub." path="/start" noindex />

      <header className="border-b border-border/40 bg-background/60 backdrop-blur">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 rounded-md bg-gradient-to-br from-emerald-500 to-violet-500 items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </span>
            <span className="font-semibold tracking-tight text-sm">Workspace Hub</span>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <LayoutDashboard className="h-3.5 w-3.5" /> Open Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 sm:px-8 py-10 sm:py-14">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          <Sparkles className="h-3 w-3 text-emerald-500" /> Welcome back
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Hi {displayName}, where to next?
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          Jump back into your dashboard, pick up where you left off, or kick off something new.
        </p>

        <div className="mt-7 grid lg:grid-cols-3 gap-3">
          <Link
            to="/dashboard"
            className="lg:col-span-2 group rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.06] to-violet-500/[0.04] p-5 sm:p-6 hover:border-emerald-500/60 transition-all"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-emerald-600 mb-2">
              <History className="h-3 w-3" /> Continue
            </div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-lg font-semibold tracking-tight">Pick up where you left off</div>
                <p className="text-xs text-muted-foreground mt-1">Your dashboard remembers recent work, tools and runs.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
          <Link
            to="/projects/new"
            className="group rounded-2xl border border-border/50 bg-card/40 p-5 hover:border-emerald-500/40 transition-all"
          >
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
              <Rocket className="h-3 w-3 text-emerald-500" /> New
            </div>
            <div className="text-base font-semibold tracking-tight">Start a project</div>
            <p className="text-xs text-muted-foreground mt-1">Fresh workspace with starter tasks.</p>
          </Link>
        </div>

        <Section label="Quick actions" icon={Target}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-2">
            {HUB_QUICK_ACTIONS.map(a => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.title}
                  to={a.href}
                  className="group rounded-xl border border-border/50 bg-card/40 p-3.5 hover:border-emerald-500/50 hover:bg-emerald-500/[0.03] transition-all"
                >
                  <span className="inline-flex h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500/15 to-violet-500/10 items-center justify-center mb-2">
                    <Icon className="h-3.5 w-3.5 text-emerald-600" />
                  </span>
                  <div className="text-sm font-medium tracking-tight">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.desc}</div>
                </Link>
              );
            })}
          </div>
        </Section>

        <div className="mt-8">
          <Section label="Recommended" icon={Compass}>
            <div className="grid sm:grid-cols-3 gap-2.5 mt-2">
              {HUB_RECOMMENDED.map(a => {
                const Icon = a.icon;
                return (
                  <Link
                    key={a.title}
                    to={a.href}
                    className="group rounded-xl border border-border/50 bg-card/40 p-3.5 hover:border-emerald-500/50 hover:bg-emerald-500/[0.03] transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="inline-flex h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-violet-500/15 to-emerald-500/10 items-center justify-center">
                        <Icon className="h-3.5 w-3.5 text-violet-600" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium tracking-tight truncate">{a.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{a.desc}</div>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                );
              })}
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}