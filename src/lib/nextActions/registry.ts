import {
  FileText, Send, Save, Receipt, Repeat, Bell, Bot,
  CheckCircle2, ArrowRight, Briefcase, Download,
  type LucideIcon,
} from "lucide-react";

export type NextActionTone = "primary" | "default" | "soft";

export interface NextActionSuggestion {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  to?: string;
  href?: string;
  tone?: NextActionTone;
  requiresIntegration?: "telegram";
  hideForTiers?: string[];
  authedOnly?: boolean;
}

export type NextActionTrigger =
  | "proposal_exported"
  | "invoice_exported"
  | "contract_exported"
  | "doc_exported"
  | "telegram_connected"
  | "workspace_created"
  | "onboarding_completed"
  | "ai_generation_completed";

export const NEXT_ACTIONS: Record<NextActionTrigger, NextActionSuggestion[]> = {
  proposal_exported: [
    { id: "proposal.deliver_telegram", label: "Deliver to Telegram", description: "Send this proposal to your client chat instantly.", icon: Send, to: "/settings/integrations", tone: "primary" },
    { id: "proposal.create_invoice", label: "Create matching invoice", description: "Lock the deal with a branded invoice.", icon: Receipt, to: "/tools/invoice-generator" },
    { id: "proposal.save_workspace", label: "Save to workspace", description: "Keep this draft alongside your client docs.", icon: Save, to: "/dashboard/workspace-os", authedOnly: true },
    { id: "proposal.client_handoff", label: "Start client handoff", description: "Draft an onboarding form for the client.", icon: Briefcase, to: "/tools/onboarding-form-builder" },
  ],
  invoice_exported: [
    { id: "invoice.send_client", label: "Send to client", description: "Deliver via Telegram or copy a share link.", icon: Send, to: "/settings/integrations", tone: "primary" },
    { id: "invoice.save_export", label: "Save export to workspace", description: "Track exports per client in one place.", icon: Save, to: "/dashboard/workspace-os", authedOnly: true },
    { id: "invoice.recurring_workflow", label: "Set up recurring invoices", description: "Automate monthly retainers.", icon: Repeat, to: "/dashboard/automations" },
  ],
  contract_exported: [
    { id: "contract.deliver_telegram", label: "Deliver to Telegram", description: "Push the signed-ready PDF to your client chat.", icon: Send, to: "/settings/integrations", tone: "primary" },
    { id: "contract.create_invoice", label: "Generate first invoice", description: "Match the contract with milestone billing.", icon: Receipt, to: "/tools/invoice-generator" },
  ],
  doc_exported: [
    { id: "doc.deliver_telegram", label: "Deliver to Telegram", description: "Async-send your latest export.", icon: Send, to: "/settings/integrations", tone: "primary" },
    { id: "doc.next_doc", label: "Open another doc", description: "Continue building your workspace library.", icon: FileText, to: "/dashboard/workspace-os" },
  ],
  telegram_connected: [
    { id: "tg.enable_export_delivery", label: "Enable export delivery", description: "Auto-push every PDF export to Telegram.", icon: Download, to: "/settings/integrations", tone: "primary" },
    { id: "tg.enable_async_notifications", label: "Enable async notifications", description: "Workflow + delivery alerts in your chat.", icon: Bell, to: "/settings/integrations" },
    { id: "tg.test_delivery", label: "Send a test delivery", description: "Confirm the integration end-to-end.", icon: CheckCircle2, to: "/settings/integrations" },
  ],
  workspace_created: [
    { id: "ws.run_first_tool", label: "Run your first tool", description: "Generate a proposal you can save here.", icon: ArrowRight, to: "/tools/proposal-generator", tone: "primary" },
    { id: "ws.connect_telegram", label: "Connect Telegram", description: "Wire async delivery into your workspace.", icon: Send, to: "/settings/integrations" },
  ],
  onboarding_completed: [
    { id: "onb.first_export", label: "Create your first export", description: "Generate a proposal or invoice in under 2 minutes.", icon: FileText, to: "/tools/proposal-generator", tone: "primary" },
    { id: "onb.connect_telegram", label: "Connect Telegram", description: "Receive every export and workflow alert.", icon: Send, to: "/settings/integrations" },
  ],
  ai_generation_completed: [
    { id: "ai.save_workspace", label: "Save to workspace", description: "Keep this output for later iteration.", icon: Save, to: "/dashboard/workspace-os", authedOnly: true },
    { id: "ai.try_workflow", label: "Run as workflow", description: "Chain this output into a delivery flow.", icon: Bot, to: "/dashboard/automations" },
  ],
};

export function getSuggestions(t: NextActionTrigger): NextActionSuggestion[] {
  return NEXT_ACTIONS[t] ?? [];
}
