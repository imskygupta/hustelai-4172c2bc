import { Link } from "react-router-dom";
import { ArrowRight, Inbox, FileSignature, Users, Briefcase, Receipt, Check } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    n: 1,
    icon: Inbox,
    title: "Capture the lead",
    body: "A new inquiry comes in through your intake form, website or a manual entry. HustleAI creates a client record and starts the operational thread.",
    detail: ["Public intake forms", "Manual client entry", "Lead status & source tracking"],
    tone: "from-sky-50 to-white border-sky-200",
  },
  {
    n: 2,
    icon: FileSignature,
    title: "Send the proposal",
    body: "Draft a branded proposal or quotation in minutes — pulling from reusable blocks and your brand kit. Send a clean, signable document.",
    detail: ["Proposal & quotation templates", "Brand kit applied automatically", "Signed share links"],
    tone: "from-violet-50 to-white border-violet-200",
  },
  {
    n: 3,
    icon: Users,
    title: "Onboard the client",
    body: "Once accepted, the client moves into onboarding: structured forms collect briefs, contracts, assets and access — without back-and-forth emails.",
    detail: ["Onboarding form builder", "Contract & NDA generator", "Client portal access"],
    tone: "from-indigo-50 to-white border-indigo-200",
  },
  {
    n: 4,
    icon: Briefcase,
    title: "Run the project",
    body: "Track the work in checklists, log time, share files and keep the client portal up to date. Everything stays attached to the client record.",
    detail: ["Checklists & deadlines", "Time tracker", "Files & client comms"],
    tone: "from-amber-50 to-white border-amber-200",
  },
  {
    n: 5,
    icon: Receipt,
    title: "Invoice & retain",
    body: "Issue invoices from logged work, track payments, and use the same record next time the client comes back. The lifecycle compounds.",
    detail: ["Invoices from time entries", "Payment status tracking", "Recurring client history"],
    tone: "from-emerald-50 to-white border-emerald-200",
  },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SEO
        title="How HustleAI Works — Lead to Invoice in One Workspace"
        description="A five-step walkthrough of how freelancers and agencies run client operations in HustleAI: capture leads, send proposals, onboard, deliver and invoice."
        path="/how-it-works"
      />
      <Navbar />

      {/* Hero */}
      <section className="pt-28 md:pt-32 pb-12 md:pb-16 px-4 bg-gradient-to-b from-slate-50 via-white to-white">
        <div className="container mx-auto max-w-3xl text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-600 text-xs">
            How it works
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-semibold tracking-tight leading-[1.05]">
            From first inquiry to final invoice — <span className="text-emerald-600">in five steps.</span>
          </h1>
          <p className="text-slate-500 md:text-lg max-w-2xl mx-auto">
            HustleAI is built around how independent client work actually flows. Here's a typical engagement from start to finish, and where the workspace fits at each stage.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-12 md:py-16 px-4 border-t border-slate-100">
        <div className="container mx-auto max-w-4xl space-y-6">
          {STEPS.map((s) => (
            <div key={s.n} className={`grid md:grid-cols-[160px_1fr] gap-6 rounded-2xl border bg-gradient-to-br ${s.tone} p-6 md:p-8`}>
              <div className="flex md:flex-col items-center md:items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                  <s.icon className="w-5 h-5 text-slate-700" />
                </div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">
                  Step 0{s.n}
                </div>
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-display font-semibold tracking-tight text-slate-900">{s.title}</h2>
                <p className="mt-2 text-slate-600 text-sm md:text-[15px] leading-relaxed">{s.body}</p>
                <ul className="mt-4 grid sm:grid-cols-3 gap-2">
                  {s.detail.map((d) => (
                    <li key={d} className="flex items-center gap-1.5 text-[12.5px] text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-16 px-4 bg-slate-50/60 border-t border-slate-100">
        <div className="container mx-auto max-w-4xl text-center space-y-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Who uses HustleAI</div>
          <h2 className="text-2xl md:text-3xl font-display font-semibold tracking-tight">Freelancers, solo operators and modern agencies</h2>
          <p className="text-slate-500 text-sm md:text-base max-w-2xl mx-auto">
            People who run real client engagements — designers, developers, consultants, marketers and small studios — who want their operations in one place instead of fifteen tabs.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-3">
            {[
              { label: "For freelancers", to: "/for-freelancers" },
              { label: "For agencies",    to: "/for-agencies" },
              { label: "For creators",    to: "/for-creators" },
            ].map((p) => (
              <Link key={p.to} to={p.to} className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-sm text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                {p.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 px-4 border-t border-slate-100">
        <div className="container mx-auto max-w-3xl text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-display font-semibold tracking-tight">
            Try it with one real client
          </h2>
          <p className="text-slate-500 text-sm md:text-base">
            The fastest way to feel the workflow is to run a real engagement through it — even just a small one.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild size="lg" className="bg-slate-900 hover:bg-slate-800 text-white">
              <Link to="/signup">Open your workspace <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300">
              <Link to="/platform">Explore the platform</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
