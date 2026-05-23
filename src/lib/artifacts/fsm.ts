// Canonical artifact finite-state-machine (browser-side mirror).
// Source of truth for legal transitions; edge functions enforce the same map
// via `_shared/artifacts/transition.ts`. Keep both lists in sync.

export type ArtifactState =
  | "generated"
  | "persisted"
  | "queued"
  | "processing"
  | "delivering"
  | "delivered"
  | "telegram_only"
  | "partial"
  | "failed"
  | "archived";

export const ARTIFACT_STATES: ArtifactState[] = [
  "generated",
  "persisted",
  "queued",
  "processing",
  "delivering",
  "delivered",
  "telegram_only",
  "partial",
  "failed",
  "archived",
];

// Allowed forward transitions. `failed` and `partial` can be retried by going
// back to `queued` (the FSM treats retries as a re-entry, NOT a duplicate row).
const TRANSITIONS: Record<ArtifactState, ArtifactState[]> = {
  generated:     ["persisted", "queued", "telegram_only", "failed", "archived"],
  persisted:     ["queued", "delivering", "delivered", "telegram_only", "partial", "failed", "archived"],
  queued:        ["processing", "delivering", "failed", "archived"],
  processing:    ["delivering", "persisted", "failed", "partial", "archived"],
  delivering:    ["delivered", "partial", "failed", "telegram_only", "archived"],
  delivered:     ["queued", "delivering", "archived"], // resend re-enters delivery
  telegram_only: ["queued", "delivering", "delivered", "archived"],
  partial:       ["queued", "delivering", "delivered", "failed", "archived"],
  failed:        ["queued", "delivering", "archived"],
  archived:      [],
};

export function canTransition(from: ArtifactState, to: ArtifactState): boolean {
  if (from === to) return true; // idempotent re-writes are fine
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStates(from: ArtifactState): ArtifactState[] {
  return TRANSITIONS[from] ?? [];
}

/** Human-friendly chip color for an artifact state (Tailwind classes). */
export function stateChipClass(state: ArtifactState | string): string {
  switch (state) {
    case "delivered":     return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
    case "delivering":
    case "processing":
    case "queued":        return "bg-sky-500/15 text-sky-300 ring-sky-500/30";
    case "telegram_only": return "bg-violet-500/15 text-violet-300 ring-violet-500/30";
    case "persisted":     return "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30";
    case "partial":       return "bg-amber-500/15 text-amber-300 ring-amber-500/30";
    case "failed":        return "bg-red-500/15 text-red-300 ring-red-500/30";
    case "archived":      return "bg-zinc-700/40 text-zinc-500 ring-zinc-700/40";
    default:              return "bg-white/[0.04] text-zinc-400 ring-white/10";
  }
}