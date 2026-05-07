import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FileText, ScrollText, ClipboardList, HelpCircle, IdCard, PackageOpen, ArrowRight, Wrench } from "lucide-react";

type Tool = {
  title: string;
  desc: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  tag: string;
  accent: string;
};

const TOOLS: Tool[] = [
  { title: "Proposal Generator", desc: "Client-ready proposals with scope, deliverables and pricing.", href: "/proposal-draft", Icon: FileText, tag: "Sales", accent: "from-emerald-500/20 to-cyan-500/10" },
  { title: "Scope Document Builder", desc: "Structured SOWs that protect margins and prevent scope creep.", href: "/workspaces/new", Icon: ScrollText, tag: "Contracts", accent: "from-violet-500/20 to-indigo-500/10" },
  { title: "Smart Client Intake", desc: "Branded intake portals that qualify and capture briefs.", href: "/workspaces", Icon: ClipboardList, tag: "Onboarding", accent: "from-amber-500/20 to-orange-500/10" },
  { title: "Discovery Questionnaires", desc: "Structured discovery flows by service category.", href: "/workspaces", Icon: HelpCircle, tag: "Discovery", accent: "from-pink-500/20 to-rose-500/10" },
  { title: "Service Offer Cards", desc: "Productized service packages with clear outcomes.", href: "/workspaces/docs", Icon: IdCard, tag: "Packaging", accent: "from-sky-500/20 to-blue-500/10" },
  { title: "Client Onboarding Packs", desc: "Welcome kits, agreements and kickoff workflows.", href: "/workspaces", Icon: PackageOpen, tag: "Delivery", accent: "from-teal-500/20 to-emerald-500/10" },
];

export function OperationalTools() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
            <Wrench className="w-3.5 h-3.5" /> Operational Tooling
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-bold mt-1">Run the whole client engagement</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Most tools stop at the proposal. Workspace OS runs everything from discovery to delivery — proposals, agreements, intake, invoices and CRM.
          </p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TOOLS.map((t, i) => (
          <motion.button
            key={t.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => navigate(t.href)}
            className={`group text-left rounded-xl border border-border/60 bg-gradient-to-br ${t.accent} p-4 hover:border-primary/40 hover:shadow-glow transition-all duration-300 hover:-translate-y-0.5`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-9 h-9 rounded-lg bg-background/70 border border-border/60 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <t.Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border/60 rounded-full px-2 py-0.5">
                {t.tag}
              </span>
            </div>
            <p className="text-sm font-semibold mt-3">{t.title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">{t.desc}</p>
            <div className="flex items-center gap-1 text-xs text-primary mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              Open tool <ArrowRight className="w-3 h-3" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export function ExecutionPipeline() {
  const steps = ["Discover", "Workspace", "Proposal", "Agreement", "Intake", "Delivery", "Invoice", "CRM"];
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-5 md:p-6">
      <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
        <ArrowRight className="w-3.5 h-3.5" /> Execution Pipeline
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 shrink-0">
            <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${i === 0 ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 bg-background/60 text-foreground/80"}`}>
              {s}
            </div>
            {i < steps.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        From opportunity discovery to client delivery — one operating system, one workflow.
      </p>
    </div>
  );
}