import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, X, Send, FileText, Search, Map as MapIcon, Receipt, Megaphone, Workflow, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { wp } from "@/lib/workspace/paths";

/**
 * ProjectQuickstart — first-action momentum panel.
 *
 * Appears ONLY on freshly-created projects (no AI outputs yet). Disappears
 * the moment the workspace produces its first output, OR when the user
 * dismisses it.
 *
 * No tutorials, no checklists, no progress bars — just 3 contextual verbs
 * derived from the project's deliverables / type / goal that route into
 * the right tool with the project pre-bound (?workspace=&intent=).
 */

type Action = { label: string; sub: string; icon: any; href: string; intent: string };

const ACTION_BANK: Record<string, Action> = {
  outreach:    { label: "Draft first cold email",    sub: "Personalised opener + follow-ups", icon: Send,       href: "canvas",    intent: "outreach" },
  icp:         { label: "Generate ICP profile",      sub: "Who you're talking to",            icon: Search,     href: "canvas",    intent: "icp" },
  content:     { label: "Generate content pillars",  sub: "3–5 themes you can publish",       icon: FileText,   href: "canvas",    intent: "content" },
  calendar:    { label: "Build publishing plan",     sub: "30-day calendar from pillars",     icon: MapIcon,    href: "canvas",    intent: "content_calendar" },
  proposal:    { label: "Draft first proposal",      sub: "Scope, pricing, terms",            icon: Megaphone,  href: "tools",     intent: "proposal" },
  invoice:     { label: "Prepare first invoice",     sub: "Client-ready PDF",                 icon: Receipt,    href: "tools",     intent: "invoice" },
  research:    { label: "Run research brief",        sub: "Sources + synthesis",              icon: Search,     href: "canvas",    intent: "research" },
  scope:       { label: "Generate project scope",    sub: "Deliverables + milestones",        icon: MapIcon,    href: "blueprint", intent: "scope" },
  strategy:    { label: "Build first strategy",      sub: "From goal to action plan",         icon: Brain,      href: "blueprint", intent: "strategy" },
  automation:  { label: "Map automation flow",       sub: "Trigger → steps → output",         icon: Workflow,   href: "canvas",    intent: "automation" },
  onboarding:  { label: "Onboarding checklist",      sub: "Kick the project off cleanly",     icon: FileText,   href: "tools",     intent: "onboarding" },
};

function pickActions(w: any): Action[] {
  const picks = new Set<string>();
  const type = w?.tags?.[0] as string | undefined;
  const goal = w?.tags?.[1] as string | undefined;
  const dels: string[] = (w?.deliverables || []).map((d: string) => d.toLowerCase());

  // Type-driven seeds
  if (type === "outreach")   { picks.add("icp"); picks.add("outreach"); picks.add("calendar"); }
  if (type === "content")    { picks.add("content"); picks.add("calendar"); picks.add("strategy"); }
  if (type === "proposal")   { picks.add("proposal"); picks.add("scope"); picks.add("invoice"); }
  if (type === "delivery")   { picks.add("onboarding"); picks.add("scope"); picks.add("invoice"); }
  if (type === "automation") { picks.add("automation"); picks.add("scope"); picks.add("strategy"); }
  if (type === "research")   { picks.add("research"); picks.add("strategy"); picks.add("content"); }

  // Deliverable-driven nudges
  if (dels.some(d => d.includes("proposal")))  picks.add("proposal");
  if (dels.some(d => d.includes("content")))   picks.add("content");
  if (dels.some(d => d.includes("outreach")))  picks.add("outreach");
  if (dels.some(d => d.includes("research")))  picks.add("research");
  if (dels.some(d => d.includes("invoice")))   picks.add("invoice");
  if (dels.some(d => d.includes("automat")))   picks.add("automation");

  // Goal nudge
  if (goal === "client_acq") picks.add("icp");

  // Sane fallback
  if (picks.size === 0) { picks.add("strategy"); picks.add("scope"); picks.add("proposal"); }

  return Array.from(picks).slice(0, 3).map(k => ACTION_BANK[k]).filter(Boolean);
}

export function ProjectQuickstart({ workspace }: { workspace: any }) {
  const [outputs, setOutputs] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!workspace?.id) return;
    setDismissed(localStorage.getItem(`ws-quickstart-dismissed:${workspace.id}`) === "1");
    (async () => {
      try {
        const { count } = await (supabase as any)
          .from("workspace_outputs")
          .select("id", { count: "exact", head: true })
          .eq("project_id", workspace.id);
        setOutputs(count ?? 0);
      } catch {
        setOutputs(0);
      }
    })();
  }, [workspace?.id]);

  if (!workspace?.id || dismissed || outputs === null || outputs > 0) return null;

  const actions = pickActions(workspace);

  function dismiss() {
    localStorage.setItem(`ws-quickstart-dismissed:${workspace.id}`, "1");
    setDismissed(true);
  }

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border border-primary/15 bg-[linear-gradient(135deg,hsl(var(--primary)/0.08),transparent_55%),linear-gradient(225deg,hsl(258_80%_64%/0.06),transparent_55%)] p-5"
      >
        {/* Soft animated glow */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-primary/15 blur-3xl"
        />
        <div className="relative flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-violet-500 items-center justify-center shadow-md shadow-primary/30">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium tracking-tight">Start building</p>
              <p className="text-[11px] text-muted-foreground">Pick one — you'll have your first deliverable in under a minute.</p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-muted-foreground/70 hover:text-foreground transition-colors p-1 -m-1"
            aria-label="Dismiss quickstart"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {actions.map((a, i) => (
            <motion.div
              key={a.intent + i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.3 }}
            >
              <Link
                to={`${wp(a.href)}?workspace=${workspace.id}&intent=${a.intent}&from=quickstart`}
                className="group block rounded-xl border border-border/50 bg-card/60 hover:bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 transition-all p-3.5 h-full"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex h-7 w-7 rounded-lg bg-primary/10 items-center justify-center">
                    <a.icon className="h-3.5 w-3.5 text-primary" />
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/60 ml-auto group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-sm font-medium leading-tight">{a.label}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{a.sub}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </AnimatePresence>
  );
}