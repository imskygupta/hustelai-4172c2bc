// Tiny pub/sub for "Zomato-style" delight toasts after pure-algo wins
// (PDF generated, draft saved, etc). Hardcoded copy + suggestion lists,
// NO AI involved. Mute persists in localStorage from the 2nd toast onwards.
export type DelightKind =
  | "invoice_pdf"
  | "proposal_pdf"
  | "contract_pdf"
  | "draft_saved"
  | "generic";

export interface DelightEvent {
  kind: DelightKind;
  /** Optional override message — otherwise picked from the deck. */
  title?: string;
  body?: string;
  /** Optional CTA. */
  ctaLabel?: string;
  ctaHref?: string;
}

type Listener = (e: DelightEvent) => void;
const listeners = new Set<Listener>();

const MUTE_KEY = "hustleai_delight_muted_v1";
const COUNT_KEY = "hustleai_delight_count_v1";

export function isDelightMuted() {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}
export function setDelightMuted(v: boolean) {
  try { v ? localStorage.setItem(MUTE_KEY, "1") : localStorage.removeItem(MUTE_KEY); } catch {}
}
export function bumpDelightCount() {
  try {
    const n = Number(localStorage.getItem(COUNT_KEY) || 0) + 1;
    localStorage.setItem(COUNT_KEY, String(n));
    return n;
  } catch { return 1; }
}
export function getDelightCount() {
  try { return Number(localStorage.getItem(COUNT_KEY) || 0); } catch { return 0; }
}

export function emitDelight(e: DelightEvent) {
  if (isDelightMuted()) return;
  listeners.forEach((l) => { try { l(e); } catch {} });
}
export function onDelight(fn: Listener) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Hardcoded delight decks — picked at random per kind. */
const DECKS: Record<DelightKind, { title: string; body: string; ctaLabel: string; ctaHref: string }[]> = {
  invoice_pdf: [
    { title: "Yeah — amazing invoice! 🎉", body: "How about you add your company logo & signature next? Branded invoices get paid 2× faster.", ctaLabel: "Add brand kit", ctaHref: "/workspaces/brand-kit" },
    { title: "Clean invoice, shipped 🚀", body: "Want to track when the client opens it? Open the dashboard Invoice Generator.", ctaLabel: "Track this invoice", ctaHref: "/dashboard/tools/invoice-generator" },
    { title: "Looking sharp ✨", body: "Save this client once and re-use the details across every future invoice.", ctaLabel: "Save client", ctaHref: "/work/clients" },
  ],
  proposal_pdf: [
    { title: "Proposal looks 🔥", body: "Add a signature block and your testimonials — proposals close 38% better with social proof.", ctaLabel: "Open Brand Kit", ctaHref: "/workspaces/brand-kit" },
    { title: "Nice scope of work!", body: "Want to send & track this from the dashboard? Convert it to an invoice with one click later.", ctaLabel: "Open dashboard tool", ctaHref: "/dashboard/tools/proposal-generator" },
  ],
  contract_pdf: [
    { title: "Contract is good to go ✍️", body: "Drop in your e-signature image so clients can sign and send it back the same hour.", ctaLabel: "Set up signature", ctaHref: "/workspaces/brand-kit" },
    { title: "Solid contract!", body: "Pair it with the matching invoice & proposal from the same client workspace.", ctaLabel: "Open Workspaces", ctaHref: "/workspaces" },
  ],
  draft_saved: [
    { title: "Saved to your browser 💾", body: "Sync it to your dashboard so you don't lose it if you clear cookies.", ctaLabel: "Open dashboard", ctaHref: "/dashboard" },
  ],
  generic: [
    { title: "Nice work!", body: "Tons more tools waiting for you in the dashboard.", ctaLabel: "Explore tools", ctaHref: "/dashboard" },
  ],
};

export function pickDelight(kind: DelightKind): DelightEvent {
  const deck = DECKS[kind] || DECKS.generic;
  const pick = deck[Math.floor(Math.random() * deck.length)];
  return { kind, ...pick };
}