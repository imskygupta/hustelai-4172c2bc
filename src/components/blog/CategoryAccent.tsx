// Maps a blog category slug to a stable accent token for editorial styling.
// Uses CSS variables defined in index.css so light/dark themes both work.
const ACCENTS: Record<string, { name: string; class: string; hex: string }> = {
  "freelancer-workflows": { name: "Freelancer Systems", class: "accent-emerald", hex: "16a34a" },
  "async-operations": { name: "Async Operations", class: "accent-sky", hex: "0ea5e9" },
  "ai-operations": { name: "AI Workflows", class: "accent-violet", hex: "8b5cf6" },
  "client-systems": { name: "Client Management", class: "accent-amber", hex: "d97706" },
  "creator-workflows": { name: "Proposals", class: "accent-rose", hex: "e11d48" },
  "telegram-delivery": { name: "Delivery", class: "accent-blue", hex: "2563eb" },
  "operational-systems": { name: "Operational Systems", class: "accent-stone", hex: "57534e" },
};

export function categoryAccent(slug?: string) {
  if (!slug) return ACCENTS["freelancer-workflows"];
  return ACCENTS[slug] ?? ACCENTS["freelancer-workflows"];
}

/** Inline pill component using the accent for the given category slug. */
export function CategoryPill({ slug, label }: { slug?: string; label: string }) {
  const a = categoryAccent(slug);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-[11px] uppercase tracking-[0.12em] font-medium ${a.class}`}
      style={{ backgroundColor: `#${a.hex}1a`, color: `#${a.hex}` }}
    >
      <span className="h-1 w-1 rounded-full" style={{ backgroundColor: `#${a.hex}` }} />
      {label}
    </span>
  );
}