import { Link } from "react-router-dom";
import {
  FileSignature, Send, Map as MapIcon, Receipt, Search, Brain, ArrowRight,
} from "lucide-react";
import { wp } from "@/lib/workspace/paths";

/**
 * Contextual AI actions inside a project. AI is NOT a separate universe —
 * these are operational verbs ("Create Proposal", "Draft Outreach", …) that
 * route into the right tool with the project pre-bound via ?workspace=<id>.
 *
 * Keep this list tight. Add new actions only when there is a real tool wired.
 */
const ACTIONS = [
  { label: "Create Proposal",    icon: FileSignature, href: "tools",     intent: "proposal" },
  { label: "Draft Outreach",     icon: Send,          href: "canvas",    intent: "outreach" },
  { label: "Generate Scope",     icon: MapIcon,       href: "blueprint", intent: "scope"    },
  { label: "Prepare Invoice",    icon: Receipt,       href: "tools",     intent: "invoice"  },
  { label: "Research Competitors", icon: Search,      href: "canvas",    intent: "research" },
  { label: "Build Strategy",     icon: Brain,         href: "blueprint", intent: "strategy" },
] as const;

export function ProjectQuickActions({ workspaceId }: { workspaceId: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Do next</p>
        <span className="text-[10px] text-muted-foreground/60">contextual</span>
      </div>
      <ul className="space-y-1">
        {ACTIONS.map((a) => {
          const to = `${wp(a.href)}?workspace=${workspaceId}&intent=${a.intent}`;
          return (
            <li key={a.label}>
              <Link
                to={to}
                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground/85 hover:bg-muted/60 hover:text-foreground transition-colors"
              >
                <a.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="flex-1 truncate">{a.label}</span>
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}