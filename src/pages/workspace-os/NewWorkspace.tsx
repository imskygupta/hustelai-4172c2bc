/**
 * NewWorkspace — 5-step premium project creation wizard.
 *
 * Direction: Linear onboarding + Notion templates + AI setup.
 * Feels like setting up an operational workspace, not filling a form.
 *
 * Steps: Identity → Goal → Deliverables → AI context → Generate.
 *
 * On generate we seed:
 *   - workspaces row (with tags from project type + goal)
 *   - 3–5 workspace_tasks tailored to chosen deliverables
 *   - 1 workspace_documents starter (quotation by default, agreement if proposal)
 *   - 1 workspace_reminders (kickoff follow-up, 3 days out)
 *   - 1 workspace_activity entry ("Workspace created")
 *
 * Then routes to the project's live detail page.
 *
 * Keep this lean. No giant modals. No settings overload. See
 * mem://features/workspace-polish-wave-creation.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, ArrowLeft, ArrowRight, Check, Loader2,
  Briefcase, Target, Package, Brain, Wand2, Building2,
  Send, FileText, Megaphone, Workflow, Search, Receipt,
  Image as ImageIcon, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { wpProject } from "@/lib/workspace/paths";
import { cn } from "@/lib/utils";
import { markMilestone } from "@/lib/onboarding/firstSession";

// ───── Option catalogues ──────────────────────────────────────────
const PROJECT_TYPES = [
  { id: "outreach",   label: "Outreach System",  icon: Send },
  { id: "content",    label: "Content Engine",   icon: FileText },
  { id: "proposal",   label: "Proposal Pipeline",icon: Megaphone },
  { id: "delivery",   label: "Client Delivery",  icon: Briefcase },
  { id: "automation", label: "Automation Setup", icon: Workflow },
  { id: "research",   label: "Research",         icon: Search },
] as const;

const GOALS = [
  { id: "client_acq",    label: "Client acquisition" },
  { id: "content_prod",  label: "Content production" },
  { id: "strategy",      label: "Strategy work" },
  { id: "proposal",      label: "Proposal delivery" },
  { id: "research",      label: "Research" },
  { id: "automation",    label: "Automation setup" },
] as const;

const DELIVERABLES = [
  { id: "proposals",    label: "Proposals" },
  { id: "content_plan", label: "Content plans" },
  { id: "docs",         label: "Docs" },
  { id: "outreach",     label: "Outreach" },
  { id: "research",     label: "Research briefs" },
  { id: "invoices",     label: "Invoices" },
  { id: "automations",  label: "Automation flows" },
] as const;

const PROVIDERS = [
  { id: "auto",    label: "Auto (recommended)" },
  { id: "gemini",  label: "Gemini" },
  { id: "openai",  label: "OpenAI" },
  { id: "claude",  label: "Claude" },
  { id: "longcat", label: "LongCat" },
] as const;

const STYLES = ["Concise", "Friendly", "Premium", "Direct", "Playful"] as const;

// ───── Seeded task templates per deliverable ──────────────────────
const TASK_TEMPLATES: Record<string, string[]> = {
  proposals:    ["Draft proposal outline", "Add scope & pricing", "Send proposal to client"],
  content_plan: ["Define content pillars", "Draft monthly calendar", "Schedule first 3 posts"],
  docs:         ["Outline core document", "Write first draft", "Review with client"],
  outreach:     ["Build target list", "Draft cold message v1", "Send first 20 messages"],
  research:     ["Define research questions", "Gather sources", "Write synthesis brief"],
  invoices:     ["Confirm pricing terms", "Send first invoice", "Track payment status"],
  automations:  ["Map manual steps", "Design automation flow", "Test end-to-end"],
};

type Step = 1 | 2 | 3 | 4 | 5;

export default function NewWorkspace() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);

  // Step 1
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName]   = useState("");
  const [companyName, setCompanyName] = useState("");
  const [projectType, setProjectType] = useState<string>("");
  const [logoUrl, setLogoUrl]         = useState<string>("");

  // Step 2
  const [goal, setGoal] = useState<string>("");

  // Step 3
  const [deliverables, setDeliverables] = useState<string[]>([]);

  // Step 4
  const [provider, setProvider] = useState<string>("auto");
  const [style, setStyle]       = useState<string>("Concise");
  const [voiceNote, setVoiceNote] = useState("");

  const canNext = useMemo(() => {
    if (step === 1) return projectName.trim().length >= 2 && clientName.trim().length >= 2 && !!projectType;
    if (step === 2) return !!goal;
    if (step === 3) return deliverables.length >= 1;
    if (step === 4) return !!provider && !!style;
    return true;
  }, [step, projectName, clientName, projectType, goal, deliverables, provider, style]);

  // Auto-advance to generate on step 5
  useEffect(() => {
    if (step === 5 && !busy) void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function toggleDeliverable(id: string) {
    setDeliverables(d => d.includes(id) ? d.filter(x => x !== id) : [...d, id]);
  }

  async function generate() {
    if (!user) return;
    setBusy(true);
    try {
      const tags = [projectType, goal].filter(Boolean);
      const { data: ws, error } = await (supabase as any)
        .from("workspaces")
        .insert({
          owner_id: user.id,
          client_name: clientName.trim(),
          company_name: companyName.trim() || null,
          logo_url: logoUrl || null,
          project_scope: projectName.trim(),
          deliverables: deliverables.map(id => DELIVERABLES.find(d => d.id === id)?.label).filter(Boolean),
          tags,
          status: "active",
          pipeline_stage: "planning",
          notes: voiceNote.trim() || null,
          source_inputs: [{
            kind: "wizard",
            project_name: projectName,
            project_type: projectType,
            goal, deliverables, provider, style,
            voice_note: voiceNote || null,
            at: new Date().toISOString(),
          }],
        })
        .select("id")
        .single();
      if (error || !ws?.id) throw new Error(error?.message || "Could not create workspace");

      const id: string = ws.id;

      // Seed tasks (max 5)
      const taskTitles = deliverables
        .flatMap(d => TASK_TEMPLATES[d] || [])
        .slice(0, 5);
      const tasks = taskTitles.map((title, i) => ({
        workspace_id: id,
        owner_id: user.id,
        title,
        stage: i === 0 ? "planning" : "inquiry",
        position: i,
      }));
      if (tasks.length) await (supabase as any).from("workspace_tasks").insert(tasks);

      // Seed starter doc — agreement when proposal-flavoured, otherwise quotation
      const wantsProposal = deliverables.includes("proposals") || projectType === "proposal";
      const docType = wantsProposal ? "agreement" : "quotation";
      await (supabase as any).from("workspace_documents").insert({
        workspace_id: id,
        owner_id: user.id,
        doc_type: docType,
        title: `${projectName.trim()} — ${docType === "agreement" ? "Agreement" : "Quotation"}`,
        data: {
          client_name: clientName,
          company: companyName || null,
          summary: `Starter ${docType} for ${projectName}.`,
        },
        status: "draft",
      });

      // Kickoff reminder
      const due = new Date(); due.setDate(due.getDate() + 3);
      await (supabase as any).from("workspace_reminders").insert({
        workspace_id: id,
        owner_id: user.id,
        title: `Follow up with ${clientName}`,
        due_at: due.toISOString(),
        kind: "followup",
      });

      // Activity entry
      await (supabase as any).from("workspace_activity").insert({
        workspace_id: id,
        owner_id: user.id,
        event_type: "workspace_created",
        message: `Workspace "${projectName}" created with ${tasks.length} starter tasks.`,
        metadata: { provider, style, deliverables, goal, projectType },
      });

      // Tiny breath so the magic-moment animation is visible
      await new Promise(r => setTimeout(r, 700));
      toast.success("Workspace ready");
      markMilestone("first_project");
      nav(wpProject(id));
    } catch (e: any) {
      toast.error(e?.message || "Could not generate workspace");
      setBusy(false);
      setStep(4);
    }
  }

  const totalSteps = 5;

  return (
    <div className="max-w-2xl mx-auto pt-2 pb-20">
      {/* Slim progress rail */}
      <div className="flex items-center gap-2 mb-10">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const n = i + 1;
          const active = n <= step;
          return (
            <div key={n}
              className={cn(
                "h-0.5 flex-1 rounded-full transition-all duration-500",
                active ? "bg-primary" : "bg-muted"
              )}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-6">
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80">
          Step {Math.min(step, 5)} of {totalSteps}
        </span>
        {step > 1 && step < 5 && (
          <button onClick={() => setStep((step - 1) as Step)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <StepShell key="1" icon={Briefcase}
            title="Let's set up your workspace"
            subtitle="Give it a name and tell us who it's for.">
            <div className="space-y-5">
              <Field label="Project name">
                <CalmInput value={projectName} onChange={setProjectName}
                  placeholder="e.g. Q3 Outreach System" autoFocus />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Client / Person">
                  <CalmInput value={clientName} onChange={setClientName} placeholder="Aman Sharma" />
                </Field>
                <Field label="Company (optional)">
                  <CalmInput value={companyName} onChange={setCompanyName} placeholder="Skinroots Co." icon={Building2} />
                </Field>
              </div>
              <Field label="Project type">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {PROJECT_TYPES.map(t => (
                    <Pickable key={t.id} active={projectType === t.id}
                      onClick={() => setProjectType(t.id)} icon={t.icon} label={t.label} />
                  ))}
                </div>
              </Field>
              <Field label="Logo or avatar (optional)">
                <LogoPick value={logoUrl} onChange={setLogoUrl} />
              </Field>
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell key="2" icon={Target}
            title="What are you trying to accomplish?"
            subtitle="This shapes the AI actions and workflow suggestions you'll see.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GOALS.map(g => (
                <Pickable key={g.id} active={goal === g.id}
                  onClick={() => setGoal(g.id)} label={g.label} large />
              ))}
            </div>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell key="3" icon={Package}
            title="What outputs will this workspace produce?"
            subtitle="Pick everything that applies — we'll pre-build the structure.">
            <div className="flex flex-wrap gap-2">
              {DELIVERABLES.map(d => {
                const on = deliverables.includes(d.id);
                return (
                  <button key={d.id} onClick={() => toggleDeliverable(d.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm transition-all",
                      on ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                         : "bg-muted/40 text-foreground/80 hover:bg-muted/70"
                    )}>
                    {on && <Check className="inline h-3.5 w-3.5 mr-1.5" />}
                    {d.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground/80 mt-6">
              {deliverables.length === 0
                ? "Pick at least one to continue."
                : `${deliverables.length} selected — we'll seed ~${Math.min(deliverables.length * 2, 5)} starter tasks.`}
            </p>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell key="4" icon={Brain}
            title="How should AI work in this project?"
            subtitle="Lightweight context — you can change this anytime.">
            <div className="space-y-5">
              <Field label="Preferred provider">
                <div className="flex flex-wrap gap-2">
                  {PROVIDERS.map(p => (
                    <Pickable key={p.id} active={provider === p.id}
                      onClick={() => setProvider(p.id)} label={p.label} />
                  ))}
                </div>
              </Field>
              <Field label="Writing style">
                <div className="flex flex-wrap gap-2">
                  {STYLES.map(s => (
                    <Pickable key={s} active={style === s} onClick={() => setStyle(s)} label={s} />
                  ))}
                </div>
              </Field>
              <Field label="Voice & context (optional)">
                <textarea
                  value={voiceNote} onChange={e => setVoiceNote(e.target.value)} rows={4}
                  placeholder="e.g. Premium D2C brand voice. Always mention sustainability. No emojis."
                  className="w-full bg-transparent border-0 border-b border-border/60 focus:border-primary outline-none text-base py-2 resize-none placeholder:text-muted-foreground/50"
                />
              </Field>
            </div>
          </StepShell>
        )}

        {step === 5 && (
          <motion.div key="5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-20">
            <motion.div
              animate={{ scale: [1, 1.08, 1], rotate: [0, 6, -6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex h-20 w-20 rounded-3xl bg-gradient-to-br from-primary via-primary/70 to-violet-500 items-center justify-center shadow-2xl shadow-primary/40 mb-6"
            >
              <Wand2 className="h-9 w-9 text-primary-foreground" />
            </motion.div>
            <h2 className="text-2xl font-semibold tracking-tight">Generating your workspace…</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Seeding tasks, starter document, follow-up reminder, and pinned actions.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Building structure
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer CTA */}
      {step < 5 && (
        <div className="mt-10 flex justify-end">
          <button
            onClick={() => canNext && setStep((step + 1) as Step)}
            disabled={!canNext}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all",
              canNext
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-[1.02]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {step === 4 ? (<><Sparkles className="h-4 w-4" /> Generate workspace</>)
                        : (<>Continue <ArrowRight className="h-4 w-4" /></>)}
          </button>
        </div>
      )}
    </div>
  );
}

// ───── Small primitives ───────────────────────────────────────────
function StepShell({
  icon: Icon, title, subtitle, children,
}: { icon: any; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-8"
    >
      <header className="space-y-3">
        <span className="inline-flex h-9 w-9 rounded-xl bg-primary/10 items-center justify-center ring-1 ring-primary/15">
          <Icon className="h-4 w-4 text-primary" />
        </span>
        <h2 className="text-2xl md:text-[28px] font-semibold tracking-tight leading-tight">{title}</h2>
        <p className="text-sm text-muted-foreground/90 max-w-lg">{subtitle}</p>
      </header>
      {children}
    </motion.section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80 mb-2">{label}</p>
      {children}
    </div>
  );
}

function CalmInput({
  value, onChange, placeholder, autoFocus, icon: Icon,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  autoFocus?: boolean; icon?: any;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 focus-within:border-primary transition-colors py-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground/70" />}
      <input
        autoFocus={autoFocus}
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="flex-1 bg-transparent border-0 outline-none text-base placeholder:text-muted-foreground/50"
      />
    </div>
  );
}

function Pickable({
  active, onClick, label, icon: Icon, large,
}: { active: boolean; onClick: () => void; label: string; icon?: any; large?: boolean }) {
  return (
    <button
      type="button" onClick={onClick}
      className={cn(
        "text-left rounded-xl transition-all flex items-center gap-2.5",
        large ? "p-4" : "px-3.5 py-2",
        active
          ? "bg-primary/10 ring-1 ring-primary/40 text-foreground"
          : "bg-muted/30 hover:bg-muted/60 text-foreground/80"
      )}
    >
      {Icon && <Icon className={cn("text-primary", active ? "opacity-100" : "opacity-70", large ? "h-4 w-4" : "h-3.5 w-3.5")} />}
      <span className={cn("text-sm", large && "font-medium")}>{label}</span>
      {active && !large && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
    </button>
  );
}

function LogoPick({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  if (value) {
    return (
      <div className="flex items-center gap-3">
        <img src={value} alt="" className="h-12 w-12 rounded-xl object-cover ring-1 ring-border/60" />
        <button onClick={() => onChange("")}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <X className="h-3 w-3" /> Remove
        </button>
      </div>
    );
  }
  return (
    <CalmInput value={value} onChange={onChange}
      placeholder="Paste an image URL (optional)" icon={ImageIcon} />
  );
}
