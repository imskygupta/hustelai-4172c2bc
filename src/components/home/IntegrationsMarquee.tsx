import { motion } from "framer-motion";
import {
  Send, MessageCircle, Mail, Calendar, Video, FileText,
  CreditCard, Database, Webhook, Sparkles, Bot, Cloud, FolderOpen,
  Receipt, Users, Workflow, FileDown,
} from "lucide-react";
import { SignalDot, AsyncLane } from "./ops-primitives";

/**
 * Premium endless integrations marquee — monochrome, calm, ecosystem-confidence.
 * Pure CSS marquee with duplicated track for seamless loop.
 */
const integrations = [
  { icon: Send, label: "Telegram", state: "live" as const },
  { icon: MessageCircle, label: "Discord", state: "live" as const },
  { icon: FolderOpen, label: "Google Workspace", state: "live" as const },
  { icon: Mail, label: "Gmail", state: "live" as const },
  { icon: Video, label: "Google Meet", state: "live" as const },
  { icon: MessageCircle, label: "Slack", state: "live" as const },
  { icon: FileText, label: "Notion", state: "live" as const },
  { icon: Workflow, label: "AI workflows", state: "live" as const },
  { icon: Receipt, label: "Invoices", state: "live" as const },
  { icon: Users, label: "CRM", state: "live" as const },
  { icon: FileDown, label: "Exports", state: "live" as const },
  { icon: CreditCard, label: "Stripe", state: "live" as const },
  { icon: CreditCard, label: "Dodo Payments", state: "live" as const },
  { icon: Video, label: "Zoom", state: "live" as const },
  { icon: Database, label: "Supabase", state: "live" as const },
  { icon: Sparkles, label: "OpenAI", state: "live" as const },
  { icon: Bot, label: "Claude", state: "live" as const },
  { icon: Bot, label: "Gemini", state: "live" as const },
  { icon: Cloud, label: "Workspace exports", state: "live" as const },
  { icon: Webhook, label: "Webhooks", state: "live" as const },
];

export function IntegrationsMarquee() {
  const track = [...integrations, ...integrations];
  return (
    <section className="py-16 md:py-20 bg-white border-y border-slate-100 overflow-hidden">
      <div className="container mx-auto max-w-6xl px-4 mb-8 md:mb-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-emerald-600 font-medium">
            <SignalDot /> Connected ecosystem
          </div>
          <h2 className="text-2xl md:text-4xl font-display font-semibold tracking-tight text-slate-900 leading-[1.15]">
            Plays nicely with the tools<br className="hidden md:block" />
            you already operate on.
          </h2>
          <p className="text-slate-500 text-sm md:text-base max-w-xl mx-auto">
            Native integrations across chat, email, calendar, storage, payments and AI providers — your workflow stays in one operating layer.
          </p>
        </motion.div>
      </div>

      <div className="relative">
        {/* Edge fade masks */}
        <div className="absolute inset-y-0 left-0 w-24 md:w-40 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 md:w-40 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        <div className="flex gap-3 md:gap-4 animate-marquee will-change-transform" style={{ width: "max-content" }}>
          {track.map((it, i) => (
            <div
              key={`${it.label}-${i}`}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-[0_4px_20px_-4px_rgba(16,185,129,0.25)] transition-all duration-300"
            >
              <div className="w-7 h-7 rounded-full bg-slate-50 group-hover:bg-emerald-50 flex items-center justify-center text-slate-500 group-hover:text-emerald-600 transition-colors">
                <it.icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-[13px] font-medium text-slate-600 group-hover:text-slate-900 whitespace-nowrap transition-colors">
                {it.label}
              </span>
              <SignalDot tone="emerald" className="ml-0.5" />
            </div>
          ))}
        </div>

        {/* Base async lane under the marquee — the ecosystem heartbeat */}
        <div className="mt-6 px-4 md:px-10 max-w-6xl mx-auto">
          <AsyncLane />
        </div>
      </div>
    </section>
  );
}