import { ArrowRight } from "lucide-react";
import type { SeoKind } from "@/lib/seo/programmatic-catalog";

const JOURNEYS: Record<SeoKind, { title: string; sub: string; steps: { label: string; hint: string }[] }> = {
  features: {
    title: "From client → document → branded export",
    sub: "How a typical operator moves a piece of work end-to-end inside HustleAI.",
    steps: [
      { label: "Client created", hint: "One record, every signal" },
      { label: "AI document drafted", hint: "Proposal · contract · invoice" },
      { label: "Approved + branded", hint: "Your theme, your logo" },
      { label: "Delivered", hint: "Portal · Telegram · email" },
    ],
  },
  workflows: {
    title: "From lead → async workflow → branded export",
    sub: "Trigger once. The workflow runs in the background and notifies you the moment it's ready.",
    steps: [
      { label: "Lead captured", hint: "Form · API · webhook" },
      { label: "Async job queued", hint: "AI works in the background" },
      { label: "Output approved", hint: "Edit, re-run or accept" },
      { label: "Delivered", hint: "Telegram · webhook · portal" },
    ],
  },
  integrations: {
    title: "From proposal → invoice → Telegram delivery",
    sub: "Connect the surfaces you already operate on. HustleAI handles the routing.",
    steps: [
      { label: "Proposal generated", hint: "Inside workspace" },
      { label: "Invoice issued", hint: "Stripe / Dodo ready" },
      { label: "Webhook fires", hint: "CRM, sheets, automations" },
      { label: "Telegram ping", hint: "Receipt + PDF in chat" },
    ],
  },
  "use-cases": {
    title: "From brief → AI workflow → client deliverable",
    sub: "How operators in this category move from kickoff to handoff inside one workspace.",
    steps: [
      { label: "Brief intake", hint: "Form or async note" },
      { label: "AI workflow runs", hint: "Drafts · summaries · scopes" },
      { label: "Studio review", hint: "Edit + approve" },
      { label: "Client deliverable", hint: "Portal + Telegram" },
    ],
  },
  "free-tools": {
    title: "From free tool → saved doc → workspace workflow",
    sub: "Try the tool free. When you're ready, continue inside the workspace and connect it to a client.",
    steps: [
      { label: "Generate", hint: "No signup needed" },
      { label: "Save to workspace", hint: "Optional account" },
      { label: "Attach to client", hint: "Living record" },
      { label: "Deliver", hint: "Portal · Telegram" },
    ],
  },
};

export function JourneySection({ kind }: { kind: SeoKind }) {
  const j = JOURNEYS[kind];
  return (
    <section className="px-4 mt-20">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-7">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-emerald-600 mb-1">Use-case journey</div>
          <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-slate-900">{j.title}</h2>
          <p className="text-slate-500 text-sm md:text-base mt-2 max-w-2xl">{j.sub}</p>
        </div>

        <div className="relative rounded-2xl border border-slate-200 bg-white p-5 md:p-7 overflow-hidden">
          {/* Animated lane indicator */}
          <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent overflow-hidden">
            <div className="h-full w-1/3 bg-emerald-500/70 animate-[lane_3.2s_ease-in-out_infinite]" />
            <style>{`@keyframes lane { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }`}</style>
          </div>

          <ol className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-2">
            {j.steps.map((s, i) => (
              <li key={s.label} className="relative flex sm:flex-col items-start sm:items-stretch gap-3 sm:gap-2">
                <div className="flex sm:flex-col sm:items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-xs font-semibold shrink-0">
                    {i + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">{s.label}</div>
                  <div className="text-[12.5px] text-slate-500 mt-0.5">{s.hint}</div>
                </div>
                {i < j.steps.length - 1 && (
                  <ArrowRight className="hidden sm:block absolute -right-2 top-2 w-4 h-4 text-slate-300" />
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}