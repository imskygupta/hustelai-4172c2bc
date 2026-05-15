/**
 * DocsLibrary — editorial "view all" surface for document workflows.
 *
 * Not a tool directory. Each tile leads with a use-case (Operational
 * Writing, Client Delivery, Outreach, Strategy, AI-assisted) and links
 * to the right tools / templates inside the workspace.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  FileText, Send, Briefcase, Compass, Sparkles, ArrowUpRight, FileSignature, Receipt, BookOpen, Mail, Wand2, Layers,
} from "lucide-react";
import { wp } from "@/lib/workspace/paths";
import { SEO } from "@/components/SEO";

type Item = { label: string; to: string; icon: any; tag?: string };
type Section = {
  id: string;
  kicker: string;
  title: string;
  description: string;
  example: string;
  accent: string;       // gradient classes for the hero band
  items: Item[];
};

const SECTIONS: Section[] = [
  {
    id: "operational",
    kicker: "01 — Operational Writing",
    title: "The paperwork that keeps the lights on.",
    description: "Quotes, agreements, invoices and statements — the documents your studio sends every week, designed to look like a brand, not a template.",
    example: "“Send a fixed-price quote with a 50% upfront agreement, branded to the client.”",
    accent: "from-amber-50 via-orange-50 to-rose-50",
    items: [
      { label: "Quotes & estimates",   to: wp("projects"),    icon: FileText, tag: "Project doc" },
      { label: "Service agreements",   to: wp("projects"),    icon: FileSignature, tag: "Project doc" },
      { label: "Invoices & receipts",  to: wp("projects"),    icon: Receipt, tag: "Project doc" },
      { label: "Brand kit",            to: wp("brand-kit"),   icon: Layers },
    ],
  },
  {
    id: "delivery",
    kicker: "02 — Client Delivery",
    title: "Hand-offs that feel like a release.",
    description: "Project briefs, status updates, scope notes — the language layer between you and the client. Built to read like one product, not five files.",
    example: "“Weekly update: what shipped, what’s next, what I need.”",
    accent: "from-emerald-50 via-teal-50 to-cyan-50",
    items: [
      { label: "Project briefs",       to: wp("projects"),  icon: BookOpen, tag: "Project doc" },
      { label: "Scope notes",          to: wp("blocks"),    icon: Layers,   tag: "Asset" },
      { label: "Status updates",       to: wp("clients"),   icon: Send },
      { label: "Roadmap snapshots",    to: wp("roadmap"),   icon: Compass },
    ],
  },
  {
    id: "outreach",
    kicker: "03 — Outreach Systems",
    title: "Cold to warm in three documents.",
    description: "Pitch decks, cold-email frames, lead-magnet PDFs. Documents that don’t just describe the offer — they qualify the buyer.",
    example: "“One-page proposal + email + intake form, all under the same brand.”",
    accent: "from-violet-50 via-purple-50 to-fuchsia-50",
    items: [
      { label: "Proposals",            to: wp("projects"),  icon: Briefcase, tag: "Project doc" },
      { label: "Intake forms",         to: wp("intake"),    icon: Mail },
      { label: "Cold email frames",    to: wp("blocks"),    icon: Send,      tag: "Asset" },
    ],
  },
  {
    id: "strategy",
    kicker: "04 — Strategy Docs",
    title: "The thinking that justifies the price.",
    description: "Positioning docs, audits, growth memos. Heavier writing where the deliverable IS the document — and the client pays for the clarity.",
    example: "“Brand audit + 90-day growth memo + pricing recommendation.”",
    accent: "from-slate-50 via-zinc-50 to-stone-50",
    items: [
      { label: "Roadmaps",             to: wp("roadmap"),   icon: Compass },
      { label: "Reusable blocks",      to: wp("blocks"),    icon: Layers,    tag: "Asset" },
      { label: "Client portfolios",    to: wp("clients"),   icon: Briefcase },
    ],
  },
  {
    id: "ai",
    kicker: "05 — AI-Assisted Workflows",
    title: "The same documents, generated faster.",
    description: "Hook your provider once and the writing surfaces draft, expand, summarise and translate inside every doc — without leaving the cockpit.",
    example: "“Draft a quote from this brief, then turn it into an invoice on signature.”",
    accent: "from-indigo-50 via-blue-50 to-sky-50",
    items: [
      { label: "Connect a provider",   to: wp("providers"), icon: Wand2,    tag: "Setup" },
      { label: "AI quick actions",     to: wp("projects"),  icon: Sparkles },
      { label: "Saved prompts",        to: "/settings/workspace", icon: FileText, tag: "Settings" },
    ],
  },
];

export default function DocsLibrary() {
  return (
    <div className="space-y-10 max-w-6xl">
      <SEO title="Document Library | Workspace" description="Editorial library of operational, delivery, outreach, strategy and AI-assisted workflows." path="" noindex />

      <header className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Document library</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
          Every document your studio sends — <span className="text-muted-foreground">organised by the work it does.</span>
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl">
          Not a tool directory. Choose the workflow you’re running and pick up the right document, brand-locked and ready to send.
        </p>
      </header>

      {SECTIONS.map((s, i) => (
        <motion.section
          key={s.id}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ delay: i * 0.04 }}
          className="rounded-3xl border border-border/60 bg-white/70 backdrop-blur-sm overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
        >
          <div className={`bg-gradient-to-br ${s.accent} px-6 md:px-10 py-8 border-b border-border/40`}>
            <p className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 font-medium mb-3">{s.kicker}</p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight leading-snug max-w-3xl">{s.title}</h2>
            <p className="text-sm md:text-[15px] text-foreground/70 mt-3 max-w-2xl leading-relaxed">{s.description}</p>
            <div className="mt-5 inline-flex items-start gap-2 rounded-xl bg-white/70 border border-border/50 px-3 py-2 text-[12.5px] text-foreground/75 italic max-w-2xl">
              <Sparkles className="h-3.5 w-3.5 mt-0.5 text-foreground/50 shrink-0" />
              <span>{s.example}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-5 md:p-6">
            {s.items.map((it) => (
              <Link
                key={it.label}
                to={it.to}
                className="group rounded-2xl border border-border/60 bg-card hover:bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/20"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="h-9 w-9 rounded-xl bg-muted/70 flex items-center justify-center text-foreground/80 group-hover:bg-foreground group-hover:text-background transition">
                    <it.icon className="h-4 w-4" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition" />
                </div>
                <p className="text-sm font-medium text-foreground">{it.label}</p>
                {it.tag && <p className="text-[11px] text-muted-foreground mt-0.5">{it.tag}</p>}
              </Link>
            ))}
          </div>
        </motion.section>
      ))}

      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
        Missing a workflow? Drop it in <Link to={wp("intake")} className="text-foreground underline">Intake</Link> — we add the most-requested editorial flows monthly.
      </div>
    </div>
  );
}
