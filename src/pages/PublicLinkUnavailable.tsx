import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Sparkles, ArrowRight, FileText, MessageSquare, Calculator, Briefcase, ShieldAlert, Clock, Lock, Ban } from "lucide-react";

export type LinkUnavailableReason =
  | "expired" | "revoked" | "not_found" | "limit_reached" | "otp_required" | "unauthorized" | "unknown";

const REASON_META: Record<LinkUnavailableReason, { title: string; subtitle: string; icon: any; tone: string }> = {
  expired:       { title: "This link has expired",       subtitle: "Ask the sender for a fresh link.",          icon: Clock,        tone: "amber" },
  revoked:       { title: "This link was revoked",       subtitle: "The owner has disabled access.",            icon: Ban,          tone: "rose" },
  not_found:     { title: "Link not found",              subtitle: "The file may have been moved or deleted.",  icon: ShieldAlert,  tone: "slate" },
  limit_reached: { title: "Link already used",           subtitle: "This share link reached its download cap.", icon: Lock,         tone: "slate" },
  otp_required:  { title: "Access code required",        subtitle: "Enter the 6-digit code from the sender.",   icon: Lock,         tone: "indigo" },
  unauthorized:  { title: "Sign-in required",            subtitle: "This link is private — sign in to access.", icon: Lock,         tone: "indigo" },
  unknown:       { title: "Link unavailable",            subtitle: "We couldn't open that file.",               icon: ShieldAlert,  tone: "slate" },
};

const TOOL_CARDS = [
  { href: "/tools/invoice-generator", title: "AI Invoice Generator", desc: "Branded invoices in 30s.", icon: FileText },
  { href: "/tools/proposal-generator", title: "Proposal Generator",   desc: "Win clients with AI proposals.", icon: Briefcase },
  { href: "/tools/pricing-calculator", title: "Pricing Calculator",   desc: "Smart freelance pricing.", icon: Calculator },
  { href: "/hustlebot",               title: "HustleBot",             desc: "Your AI side-hustle mentor.", icon: MessageSquare },
];

export default function PublicLinkUnavailable({ reason = "unknown" }: { reason?: LinkUnavailableReason }) {
  const meta = REASON_META[reason] || REASON_META.unknown;
  const Icon = meta.icon;
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <Helmet>
        <title>Link unavailable — HustleAI</title>
        <meta name="robots" content="noindex,nofollow" />
        <link rel="canonical" href="https://hustlaiapp.in/" />
      </Helmet>
      <div className="max-w-3xl mx-auto px-5 pt-16 pb-24">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Sparkles className="h-4 w-4 text-violet-400" /> HustleAI
        </Link>

        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <div className={`mx-auto h-14 w-14 rounded-2xl bg-${meta.tone}-500/15 ring-1 ring-${meta.tone}-500/30 flex items-center justify-center`}>
            <Icon className={`h-6 w-6 text-${meta.tone}-300`} />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">{meta.title}</h1>
          <p className="mt-2 text-sm text-slate-400">{meta.subtitle}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500/20 ring-1 ring-violet-500/40 text-violet-200 px-5 py-2.5 text-sm font-medium hover:bg-violet-500/30 transition">
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/" className="text-sm text-slate-400 hover:text-slate-200">Back home</Link>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-4">Try free AI tools</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {TOOL_CARDS.map((t) => {
              const TIcon = t.icon;
              return (
                <Link key={t.href} to={t.href}
                  className="group rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-violet-500/40 hover:bg-violet-500/[0.04] transition">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20 text-violet-300 flex items-center justify-center shrink-0">
                      <TIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-100 group-hover:text-violet-100 transition">{t.title}</div>
                      <div className="text-[12px] text-slate-400 mt-0.5">{t.desc}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <p className="mt-12 text-center text-[11px] text-slate-600">
          HustleAI · AI tools for freelancers and creators · <Link to="/" className="hover:text-slate-400">hustlaiapp.in</Link>
        </p>
      </div>
    </div>
  );
}
