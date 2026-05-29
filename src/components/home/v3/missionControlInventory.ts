// V3 Mission Control — locked inventory. See mem/product/v3-mission-control-contract.md.
// Every node and edge below must map 1:1 to a real HustleAI capability.

export type LayerId =
  | "inputs"
  | "planning"
  | "intelligence"
  | "execution"
  | "delivery"
  | "outcomes";

export interface NodeDef {
  id: string;
  label: string;
  layer: LayerId;
}

export interface LayerDef {
  id: LayerId;
  index: number; // 0..5 vertical stack
  title: string;
  caption: string;
  nodes: NodeDef[];
}

export const LAYERS: LayerDef[] = [
  {
    id: "inputs",
    index: 0,
    title: "Inputs",
    caption: "Incoming work",
    nodes: [
      { id: "client", label: "Clients", layer: "inputs" },
      { id: "lead", label: "Leads", layer: "inputs" },
      { id: "opportunity", label: "Opportunities", layer: "inputs" },
      { id: "request", label: "Requests", layer: "inputs" },
    ],
  },
  {
    id: "planning",
    index: 1,
    title: "Planning",
    caption: "Work gets organized",
    nodes: [
      { id: "workspace", label: "Workspace", layer: "planning" },
      { id: "roadmap", label: "Roadmaps", layer: "planning" },
      { id: "project", label: "Projects", layer: "planning" },
      { id: "task", label: "Tasks", layer: "planning" },
    ],
  },
  {
    id: "intelligence",
    index: 2,
    title: "Intelligence",
    caption: "AI assists execution",
    nodes: [
      { id: "hustlebot", label: "HustleBot", layer: "intelligence" },
      { id: "ai-workspace", label: "AI Workspace", layer: "intelligence" },
      { id: "doc-ai", label: "Document AI", layer: "intelligence" },
      { id: "research", label: "Research", layer: "intelligence" },
    ],
  },
  {
    id: "execution",
    index: 3,
    title: "Execution",
    caption: "Work ships",
    nodes: [
      { id: "proposal", label: "Proposals", layer: "execution" },
      { id: "contract", label: "Contracts", layer: "execution" },
      { id: "invoice", label: "Invoices", layer: "execution" },
      { id: "export", label: "Exports", layer: "execution" },
    ],
  },
  {
    id: "delivery",
    index: 4,
    title: "Delivery",
    caption: "Deliverables leave the system",
    nodes: [
      { id: "telegram", label: "Telegram", layer: "delivery" },
      { id: "portal", label: "Client Portal", layer: "delivery" },
      { id: "shared", label: "Shared Links", layer: "delivery" },
      { id: "notify", label: "Notifications", layer: "delivery" },
    ],
  },
  {
    id: "outcomes",
    index: 5,
    title: "Outcomes",
    caption: "Revenue returns",
    nodes: [
      { id: "approval", label: "Approvals", layer: "outcomes" },
      { id: "payment", label: "Payments", layer: "outcomes" },
      { id: "retention", label: "Retention", layer: "outcomes" },
      { id: "repeat", label: "Repeat Work", layer: "outcomes" },
    ],
  },
];

// Allowed edges only — real platform relationships.
export const EDGES: Array<[string, string]> = [
  // Primary spine: Client → Proposal → Approval → Contract → Delivery → Invoice → Payment
  ["client", "proposal"],
  ["proposal", "approval"],
  ["approval", "contract"],
  ["contract", "portal"], // delivery via Client Portal
  ["portal", "invoice"],
  ["invoice", "payment"],
  // Secondary spine: Client → Workspace → AI → Export → Telegram
  ["client", "workspace"],
  ["workspace", "ai-workspace"],
  ["ai-workspace", "export"],
  ["export", "telegram"],
];

export const PILLARS = [
  "Proposal Engine",
  "Invoice Engine",
  "AI Workspace",
  "Client Portal",
  "Telegram Delivery",
  "Workflow OS",
];

// Layout: each layer is a row at y = -index * spacing. Nodes spaced along X.
export const LAYER_SPACING_Y = 1.35;
export const NODE_SPACING_X = 2.0;

export function nodePosition(nodeId: string): [number, number, number] {
  for (const layer of LAYERS) {
    const i = layer.nodes.findIndex((n) => n.id === nodeId);
    if (i >= 0) {
      const count = layer.nodes.length;
      const x = (i - (count - 1) / 2) * NODE_SPACING_X;
      const y = -layer.index * LAYER_SPACING_Y + LAYER_SPACING_Y * 2.5;
      return [x, y, 0];
    }
  }
  return [0, 0, 0];
}