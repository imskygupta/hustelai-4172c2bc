/** Operator persona taxonomy used across blog discovery + filtering. */
export type OperatorPersona =
  | "beginner-freelancer"
  | "solo-operator"
  | "agency-owner"
  | "telegram-first"
  | "async-workflow"
  | "client-systems";

export interface PersonaMeta {
  id: OperatorPersona;
  label: string;
  emoji: string;
  blurb: string;
}

export const OPERATOR_PERSONAS: PersonaMeta[] = [
  { id: "beginner-freelancer", label: "Beginner Freelancer", emoji: "🧑‍💻", blurb: "Just landed your first client" },
  { id: "solo-operator",       label: "Solo Operator",       emoji: "🚀", blurb: "Running everything yourself"     },
  { id: "agency-owner",        label: "Agency Owner",         emoji: "🏢", blurb: "2–10 person studio"             },
  { id: "telegram-first",      label: "Telegram-first",       emoji: "📲", blurb: "Run ops inside chat"            },
  { id: "async-workflow",      label: "Async Workflow",       emoji: "🌀", blurb: "No-meeting delivery"            },
  { id: "client-systems",      label: "Client Systems",       emoji: "🧩", blurb: "Onboarding + delivery + comms"  },
];

const TAG_TO_PERSONA: Record<string, OperatorPersona> = {
  freelancer: "beginner-freelancer",
  freelancing: "beginner-freelancer",
  beginner: "beginner-freelancer",
  solo: "solo-operator",
  operator: "solo-operator",
  productivity: "solo-operator",
  agency: "agency-owner",
  agencies: "agency-owner",
  studio: "agency-owner",
  telegram: "telegram-first",
  chat: "telegram-first",
  async: "async-workflow",
  delivery: "async-workflow",
  workflow: "async-workflow",
  workflows: "async-workflow",
  onboarding: "client-systems",
  client: "client-systems",
  clients: "client-systems",
  crm: "client-systems",
  proposals: "client-systems",
  invoicing: "client-systems",
};

/** Best-effort: map a post's tags + category to one or more personas. */
export function inferPersonas(tags: string[] = [], category?: string | null): OperatorPersona[] {
  const found = new Set<OperatorPersona>();
  for (const raw of [...tags, category ?? ""]) {
    const k = raw.toLowerCase().trim();
    if (!k) continue;
    for (const [needle, persona] of Object.entries(TAG_TO_PERSONA)) {
      if (k.includes(needle)) found.add(persona);
    }
  }
  return [...found];
}

export function personaMeta(id: OperatorPersona): PersonaMeta {
  return OPERATOR_PERSONAS.find((p) => p.id === id) ?? OPERATOR_PERSONAS[0];
}