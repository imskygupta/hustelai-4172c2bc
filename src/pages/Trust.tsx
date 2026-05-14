import { Link } from "react-router-dom";
import { Shield, FileText, Lock, Receipt, Scale, Mail, Building2, CheckCircle2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BRAND, SUPPORT_EMAIL } from "@/config/branding";

const cards = [
  { to: "/security", icon: Lock, title: "Security", desc: "Encryption in transit, RLS-isolated tenant data, audit-logged admin actions." },
  { to: "/compliance", icon: Scale, title: "Compliance", desc: "Jurisdiction, subprocessors, tax and audit posture." },
  { to: "/privacy-policy", icon: Shield, title: "Privacy", desc: "What we collect, why, and how customers control their data." },
  { to: "/data-policy", icon: FileText, title: "Data policy", desc: "Retention, exports, and deletion guarantees for workspace data." },
  { to: "/refund-policy", icon: Receipt, title: "Refunds", desc: "Subscription billing terms and refund eligibility." },
  { to: "/acceptable-use", icon: CheckCircle2, title: "Acceptable use", desc: "What workspaces may and may not be used for." },
  { to: "/terms-conditions", icon: FileText, title: "Terms", desc: "Service terms governing use of the workspace." },
  { to: "/contact", icon: Mail, title: "Support", desc: "Reach a human operator for billing, security or product questions." },
];

export default function Trust() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <SEO
        title="Trust Center | HustleAI Workspace"
        description="Security, compliance, privacy and operational transparency for HustleAI Workspace — the client operations workspace for freelancers and agencies."
        path="/trust"
      />
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
          <div className="container max-w-5xl mx-auto px-4 py-20">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
              <Shield className="w-3 h-3" /> Trust Center
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mt-4 leading-tight">
              Operational transparency for the people who pay us.
            </h1>
            <p className="text-slate-600 mt-4 max-w-2xl">
              {BRAND.name} is a focused client operations workspace for freelancers and agencies.
              We publish our security posture, compliance footprint, billing terms and operator policies
              in one place so customers, partners and payment providers can verify how we operate.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                <Building2 className="w-4 h-4 text-slate-500" /> Operated from India
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                <Mail className="w-4 h-4 text-slate-500" />
                <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-slate-900">{SUPPORT_EMAIL}</a>
              </span>
              <a href={BRAND.url} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 hover:border-slate-300">
                {BRAND.domain}
              </a>
            </div>
          </div>
        </section>

        <section className="container max-w-5xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((c) => (
              <Link
                key={c.to}
                to={c.to}
                className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-300 hover:shadow-sm transition"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                  <c.icon className="w-4 h-4" />
                </div>
                <p className="font-semibold">{c.title}</p>
                <p className="text-sm text-slate-500 mt-1">{c.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="container max-w-5xl mx-auto px-4 pb-20">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8">
            <h2 className="font-display text-xl font-semibold">What HustleAI is</h2>
            <p className="text-slate-600 mt-2 text-sm leading-relaxed">
              A subscription workspace where freelancers and agencies manage client proposals, onboarding,
              invoices, projects and async delivery. It is not a marketing automation tool, a mass-messaging
              platform, or a content distribution network.
            </p>
            <h2 className="font-display text-xl font-semibold mt-6">How we charge</h2>
            <p className="text-slate-600 mt-2 text-sm leading-relaxed">
              Recurring subscription billing in INR and USD via licensed payment partners. All plans, taxes
              and refund eligibility are documented on the <Link to="/plans" className="text-emerald-700 underline">plans</Link> and
              {" "}<Link to="/refund-policy" className="text-emerald-700 underline">refund policy</Link> pages.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}