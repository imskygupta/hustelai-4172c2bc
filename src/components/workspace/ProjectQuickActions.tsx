import { useState } from "react";
import {
  FileSignature, Send, Map as MapIcon, Receipt, Search, Brain, ArrowRight, Workflow,
} from "lucide-react";
import { IntentRunner } from "./IntentRunner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

/**
 * Contextual AI actions inside a project. AI is NOT a separate universe —
 * these are operational verbs ("Create Proposal", "Draft Outreach", …) that
 * route into the right tool with the project pre-bound via ?workspace=<id>.
 *
 * Keep this list tight. Add new actions only when there is a real tool wired.
 */
const ACTIONS = [
  { label: "Create Proposal",      icon: FileSignature, intent: "proposal" },
  { label: "Draft Outreach",       icon: Send,          intent: "outreach" },
  { label: "Generate Scope",       icon: MapIcon,       intent: "scope"    },
  { label: "Prepare Invoice",      icon: Receipt,       intent: "invoice"  },
  { label: "Research Competitors", icon: Search,        intent: "research" },
  { label: "Build Strategy",       icon: Brain,         intent: "strategy" },
  { label: "Map Automation",       icon: Workflow,      intent: "automation" },
] as const;

export function ProjectQuickActions({ workspaceId }: { workspaceId: string }) {
  const [active, setActive] = useState<typeof ACTIONS[number] | null>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      const { data } = await (supabase as any).from("workspaces").select("*").eq("id", workspaceId).maybeSingle();
      setWorkspace(data);
    })();
  }, [workspaceId]);
  return (
    <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-4">
      {active && workspace && (
        <IntentRunner
          open={!!active}
          onClose={() => setActive(null)}
          intent={active.intent}
          label={active.label}
          workspace={workspace}
        />
      )}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Do next</p>
        <span className="text-[10px] text-muted-foreground/70">AI-powered</span>
      </div>
      <ul className="space-y-1">
        {ACTIONS.map((a) => {
          return (
            <li key={a.label}>
              <button
                type="button"
                onClick={() => setActive(a)}
                disabled={!workspace}
                className="group w-full text-left flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-foreground/90 hover:bg-muted/60 hover:text-foreground transition-colors disabled:opacity-50"
              >
                <a.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="flex-1 truncate">{a.label}</span>
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}