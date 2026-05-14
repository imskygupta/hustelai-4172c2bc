/**
 * Operational Flows = outcome-grouped journeys.
 *
 * Users think in OUTCOMES ("win the client", "get paid"), not in
 * tool categories ("proposal generator", "invoice generator").
 *
 * Each flow stitches together existing tools/pages as a single
 * guided journey. Used by the dashboard to replace the tool-wall
 * with workflow-first grouping + progressive disclosure.
 *
 * No DB calls. Pure editorial source of truth.
 */

import {
  Handshake, Rocket, PackageCheck, Receipt, Repeat,
  type LucideIcon,
} from "lucide-react";

export interface FlowStep {
  label: string;
  desc: string;
  to: string;
  /** Optional minimum tier for the destination (used to show a soft lock). */
  minTier?: "pro" | "elite" | "infinity";
}

export interface OperationalFlow {
  id: string;
  outcome: string;        // user-facing outcome label, e.g. "Win the client"
  pitch: string;          // 1-line description of what this flow achieves
  icon: LucideIcon;
  accent: string;         // tailwind gradient classes for the hero pill
  steps: FlowStep[];
  /** Default landing route when the user clicks "Start flow". */
  startAt: string;
}

export const OPERATIONAL_FLOWS: OperationalFlow[] = [
  {
    id: "win-client",
    outcome: "Win the client",
    pitch: "Turn an inbound lead into a signed engagement.",
    icon: Handshake,
    accent: "from-emerald-500 to-teal-500",
    startAt: "/dashboard/tools/proposal-generator",
    steps: [
      { label: "Proposal",   desc: "Draft a polished pitch",      to: "/dashboard/tools/proposal-generator" },
      { label: "Pricing",    desc: "Lock 3-tier pricing",         to: "/dashboard/tools/pricing-calculator" },
      { label: "Agreement",  desc: "Generate a contract / NDA",   to: "/dashboard/tools/contract-generator" },
      { label: "Onboard",    desc: "Send branded intake forms",   to: "/workspaces/intake" },
    ],
  },
  {
    id: "kickoff",
    outcome: "Kick off the project",
    pitch: "Set up the workspace, brand and client record so delivery flows.",
    icon: Rocket,
    accent: "from-violet-500 to-fuchsia-500",
    startAt: "/workspaces/new",
    steps: [
      { label: "New workspace", desc: "Per-engagement workspace",      to: "/workspaces/new" },
      { label: "Client record", desc: "Add to your CRM",               to: "/workspaces/clients" },
      { label: "Brand kit",     desc: "Logos / colors for every doc",  to: "/workspaces/brand-kit", minTier: "pro" },
      { label: "Intake form",   desc: "Collect everything you need",   to: "/workspaces/intake" },
    ],
  },
  {
    id: "deliver",
    outcome: "Deliver the work",
    pitch: "Track files, deadlines and updates without bouncing tabs.",
    icon: PackageCheck,
    accent: "from-sky-500 to-indigo-500",
    startAt: "/work",
    steps: [
      { label: "Work hub",    desc: "Your daily cockpit",           to: "/work" },
      { label: "Files",       desc: "Versioned deliverables",       to: "/work/files" },
      { label: "Deadlines",   desc: "Color-coded countdowns",       to: "/work/deadlines", minTier: "pro" },
      { label: "Client portal", desc: "One link the client opens",  to: "/client", minTier: "elite" },
    ],
  },
  {
    id: "get-paid",
    outcome: "Get paid",
    pitch: "Invoice cleanly, log expenses, get the money in.",
    icon: Receipt,
    accent: "from-amber-500 to-orange-500",
    startAt: "/dashboard/tools/invoice-generator",
    steps: [
      { label: "Invoice",   desc: "GST-ready invoice in 2 minutes", to: "/dashboard/tools/invoice-generator" },
      { label: "Time log",  desc: "Auto-bill tracked hours",        to: "/work/time" },
      { label: "Expenses",  desc: "Track tools & subscriptions",    to: "/work/expenses" },
      { label: "Revenue",   desc: "See your earnings dashboard",    to: "/workspaces/revenue" },
    ],
  },
  {
    id: "retain",
    outcome: "Retain & grow",
    pitch: "Keep clients warm, ship retainers, make every project a case study.",
    icon: Repeat,
    accent: "from-rose-500 to-pink-500",
    startAt: "/work/clients",
    steps: [
      { label: "CRM check-ins", desc: "See who needs a nudge",        to: "/work/clients" },
      { label: "Comm log",      desc: "Calls & messages on record",   to: "/work/comm",    minTier: "elite" },
      { label: "Portfolio bio", desc: "Refresh your public bio",      to: "/dashboard/tools/portfolio-bio" },
      { label: "Stories",       desc: "Turn delivery into a story",   to: "/stories" },
    ],
  },
];

export function getFlow(id: string): OperationalFlow | undefined {
  return OPERATIONAL_FLOWS.find((f) => f.id === id);
}