import { Link } from "react-router-dom";
import { FileText, MapPinned, Receipt, MessageSquare, Sparkles, Briefcase, Boxes } from "lucide-react";

const SOURCES = [
  { Icon: MapPinned,     label: "AI roadmaps",    desc: "Generate one in Explore",         to: "/explore" },
  { Icon: Receipt,       label: "Invoices",       desc: "Bill clients from Workspace",     to: "/" },
  { Icon: Briefcase,     label: "Proposals",      desc: "Draft proposals for new clients", to: "/proposal-generator" },
  { Icon: FileText,      label: "Workspace docs", desc: "Save SOPs and templates",         to: "/library" },
  { Icon: MessageSquare, label: "AI chats",       desc: "Export HustleBot conversations",  to: "/hustlebot" },
  { Icon: Sparkles,      label: "Resume PDFs",    desc: "Build a resume",                  to: "/resume-optimizer" },
];

export function ArtifactEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8">
      <div className="flex items-center gap-2 text-foreground">
        <Boxes className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Your operational memory starts here</h3>
      </div>
      <p className="text-sm text-foreground/70 mt-1.5 max-w-xl">
        Every file, doc, and AI output you generate inside HustleAI lands here — searchable, shareable, and persistent.
        Try one of the modules below to fill your artifact stream.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-5">
        {SOURCES.map(({ Icon, label, desc, to }) => (
          <Link
            key={label}
            to={to}
            className="flex items-start gap-3 rounded-lg border border-border bg-background/60 hover:bg-background hover:border-primary/40 transition-colors p-3"
          >
            <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-medium text-foreground">{label}</div>
              <div className="text-[11px] text-foreground/65 mt-0.5">{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}