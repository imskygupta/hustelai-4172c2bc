/**
 * IntentLauncher — workflow-first entry surface (Wave 5).
 *
 * The workspace used to surface tools (Canvas, Blueprint, Knowledge Hub).
 * Operators don't think in tools — they think in outcomes. This component
 * presents 5 high-level intents and quietly routes each to the best
 * underlying tool. Tools still exist; the UX just leads with intent.
 *
 * Each intent carries a soft provider recommendation so users never have
 * to ask "which provider should I pick for this?".
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Target, Send, Megaphone, Library, Package, ArrowRight, Sparkles,
} from "lucide-react";
import { useWorkspace, PROVIDER_LABELS } from "@/lib/workspace/context";

type Intent = {
  id: string;
  title: string;
  hint: string;
  href: string;
  icon: typeof Target;
  bestWith: string; // provider id recommendation
  why: string;      // one-liner microcopy
};

const INTENTS: Intent[] = [
  {
    id: "strategy",
    title: "Build Client Strategy",
    hint: "Positioning, scope, deliverables",
    href: "/hustle-blueprint",
    icon: Target,
    bestWith: "anthropic",
    why: "Claude reasons through strategic frames cleanly",
  },
  {
    id: "outreach",
    title: "Create Outreach System",
    hint: "Cold sequences, ICP, follow-ups",
    href: "/canvas?intent=outreach",
    icon: Send,
    bestWith: "openai",
    why: "GPT writes high-conversion short copy",
  },
  {
    id: "content",
    title: "Generate Content Plan",
    hint: "Hooks, calendars, repurposing",
    href: "/canvas?intent=content",
    icon: Megaphone,
    bestWith: "gemini",
    why: "Gemini handles long context calendars well",
  },
  {
    id: "research",
    title: "Organize Research",
    hint: "Notes, sources, structured briefs",
    href: "/knowledge-hub",
    icon: Library,
    bestWith: "gemini",
    why: "Long-context summarization at low cost",
  },
  {
    id: "deliverables",
    title: "Prepare Deliverables",
    hint: "Proposals, decks, reports",
    href: "/canvas?intent=deliverables",
    icon: Package,
    bestWith: "anthropic",
    why: "Claude produces polished long-form drafts",
  },
];

export function IntentLauncher() {
  const { activeProvider } = useWorkspace();
  const current = activeProvider?.provider;

  return (
    <section className="rounded-2xl border border-border/60 ws-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium tracking-tight">What do you want to build?</h3>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">· workflow-first</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {INTENTS.map((it, i) => {
          const matched = current && current === it.bestWith;
          return (
            <motion.div
              key={it.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link
                to={it.href}
                className="group block rounded-xl border border-border/50 bg-background/40 p-3 ws-launch-card h-full"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <it.icon className="h-4 w-4 text-primary" />
                  </div>
                  {matched && (
                    <span className="text-[9px] uppercase tracking-wider text-emerald-600 inline-flex items-center gap-1">
                      <span className="ws-dot ws-dot--ok" /> ready
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium leading-tight">{it.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{it.hint}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-2 line-clamp-1">
                  Best with {PROVIDER_LABELS[it.bestWith] || it.bestWith}
                </p>
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary opacity-0 group-hover:opacity-100 transition">
                  Start <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}