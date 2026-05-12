/**
 * Parse an optional editorial meta block from the top of a post body.
 *
 *   :::meta
 *   reviewed_by: Sky Gupta
 *   difficulty: Intermediate
 *   setup_time: 25 min
 *   notes: Tested with Telegram delivery + Notion clients.
 *   examples: Solo consultants, async agencies
 *   :::
 *
 * Returns the parsed meta and the body with the block stripped.
 */
export type EditorialMeta = {
  reviewed_by?: string;
  difficulty?: "Beginner" | "Intermediate" | "Advanced" | string;
  setup_time?: string;
  notes?: string;
  examples?: string;
};

export function extractEditorialMeta(md: string): { meta: EditorialMeta; body: string } {
  if (!md) return { meta: {}, body: "" };
  const m = md.match(/^\s*:::meta\s*\n([\s\S]*?)\n:::\s*\n?/);
  if (!m) return { meta: {}, body: md };
  const meta: EditorialMeta = {};
  for (const raw of m[1].split("\n")) {
    const kv = raw.match(/^([a-z_]+)\s*:\s*(.+)$/i);
    if (!kv) continue;
    const key = kv[1].trim().toLowerCase();
    const val = kv[2].trim();
    if (key in ({ reviewed_by: 1, difficulty: 1, setup_time: 1, notes: 1, examples: 1 } as any)) {
      (meta as any)[key] = val;
    }
  }
  return { meta, body: md.slice(m[0].length) };
}