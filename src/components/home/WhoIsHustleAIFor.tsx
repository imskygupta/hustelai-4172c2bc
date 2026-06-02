import { Link } from "react-router-dom";
import { ArrowRight, Users, Rocket, Building2, Send } from "lucide-react";

const TONE_GRADIENT: Record<string, string> = {
  emerald: "from-emerald-500 via-teal-500 to-emerald-600",
  violet:  "from-violet-500 via-fuchsia-500 to-violet-600",
  sky:     "from-sky-500 via-cyan-500 to-sky-600",
  amber:   "from-amber-500 via-orange-500 to-amber-600",
};


const PERSONAS = [
  {
    icon: Users,
    emoji: "🧑‍💻",
    label: "Freelancers",
    headline: "Got your first client? Now run it like a system.",
    body: "Manage proposals, invoices, onboarding, delivery and client communication from one AI workspace — instead of 12 tabs.",
    cta: "Start freelancing operations",
    to: "/for-freelancers",
    tone: "emerald" as const,
  },
  {
    icon: Rocket,
    emoji: "🚀",
    label: "Solo Hustlers",
    headline: "Build your operating system, not more tabs.",
    body: "Automate repetitive work, organize workflows and ship deliverables async — without juggling tools every hour.",
    cta: "Build your operating system",
    to: "/for-creators",
    tone: "violet" as const,
  },
  {
    icon: Building2,
    emoji: "🏢",
    label: "Small Agencies",
    headline: "Scale client ops without hiring ops staff.",
    body: "Multi-client pipelines, async approvals, branded portals and reusable SOPs in a single workspace built for 2-10 person studios.",
    cta: "Scale client operations",
    to: "/for-agencies",
    tone: "sky" as const,
  },
  {
    icon: Send,
    emoji: "📲",
    label: "Telegram-first Operators",
    headline: "Run your business inside Telegram.",
    body: "Deliver client updates, approvals and workflows directly through Telegram instead of bloated dashboards.",
    cta: "Explore Telegram workflows",
    to: "/for-telegram-business",
    tone: "amber" as const,
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
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-12px_rgba(15,23,42,0.18)]"
            >
              <div className={`relative h-16 bg-gradient-to-br ${TONE_GRADIENT[p.tone]} px-4 flex items-center justify-between`}>
                <div aria-hidden className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full bg-white/25 blur-2xl" />
                <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur ring-1 ring-white/30">
                  <p.icon className="w-4 h-4 text-white" />
                </div>
                <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-700 shadow-sm">
                  <span className="text-base leading-none">{p.emoji}</span>
                  {p.label}
                </span>
              </div>
              <div className="p-6 md:p-7">
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
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}