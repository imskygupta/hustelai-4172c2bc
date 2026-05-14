import { Link } from "react-router-dom";
import { ArrowRight, Users, Rocket, Building2, Send } from "lucide-react";

const PERSONAS = [
  {
    icon: Users,
    emoji: "🧑‍💻",
    label: "Freelancers",
    headline: "Got your first client? Now run it like a system.",
    body: "Manage proposals, invoices, onboarding, delivery and client communication from one AI workspace — instead of 12 tabs.",
    cta: "Start freelancing operations",
    to: "/for-freelancers",
    tone: "from-emerald-500/10 to-emerald-500/0 border-emerald-200 hover:border-emerald-300",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    icon: Rocket,
    emoji: "🚀",
    label: "Solo Hustlers",
    headline: "Build your operating system, not more tabs.",
    body: "Automate repetitive work, organize workflows and ship deliverables async — without juggling tools every hour.",
    cta: "Build your operating system",
    to: "/for-creators",
    tone: "from-violet-500/10 to-violet-500/0 border-violet-200 hover:border-violet-300",
    chip: "bg-violet-50 text-violet-700 border-violet-200",
  },
  {
    icon: Building2,
    emoji: "🏢",
    label: "Small Agencies",
    headline: "Scale client ops without hiring ops staff.",
    body: "Multi-client pipelines, async approvals, branded portals and reusable SOPs in a single workspace built for 2-10 person studios.",
    cta: "Scale client operations",
    to: "/for-agencies",
    tone: "from-sky-500/10 to-sky-500/0 border-sky-200 hover:border-sky-300",
    chip: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    icon: Send,
    emoji: "📲",
    label: "Telegram-first Operators",
    headline: "Run your business inside Telegram.",
    body: "Deliver client updates, approvals and workflows directly through Telegram instead of bloated dashboards.",
    cta: "Explore Telegram workflows",
    to: "/for-telegram-business",
    tone: "from-amber-500/10 to-amber-500/0 border-amber-200 hover:border-amber-300",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
  },
];

export function WhoIsHustleAIFor() {
  return (
    <section className="px-4 py-20 md:py-28 bg-white">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12 md:mb-14 max-w-3xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-emerald-600 mb-3">
            Who is HustleAI for?
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900">
            Built for modern freelancers, creators,<br className="hidden md:block" /> consultants and agency operators.
          </h2>
          <p className="text-slate-500 text-base md:text-lg mt-4 leading-relaxed">
            HustleAI is the operating system for people who run client work async — solo or in small teams. Pick the lane that fits how you operate.
          </p>
        </div>

        <div className="grid gap-4 md:gap-5 md:grid-cols-2">
          {PERSONAS.map((p) => (
            <Link
              key={p.to}
              to={p.to}
              className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 md:p-7 transition-all duration-300 hover:shadow-[0_8px_32px_-12px_rgba(15,23,42,0.18)] ${p.tone}`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-semibold uppercase tracking-wider ${p.chip}`}>
                  <span className="text-base leading-none">{p.emoji}</span>
                  {p.label}
                </span>
                <p.icon className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>
              <h3 className="text-xl md:text-2xl font-display font-semibold text-slate-900 leading-snug mb-2.5">
                {p.headline}
              </h3>
              <p className="text-sm md:text-[15px] text-slate-600 leading-relaxed mb-5">
                {p.body}
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                {p.cta}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}