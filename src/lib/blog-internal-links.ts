/**
 * Internal linking engine.
 *
 * Given rendered HTML and a lightweight index of other posts/tools/workflows,
 * inject contextual <a> links on the FIRST occurrence of a matching phrase
 * inside paragraph text (skip headings, code, existing anchors, lists).
 *
 * Designed to keep editorial tone:
 * - max N injections per post
 * - never link the same target twice
 * - never link inside <a>, <h*>, <code>, <pre>, <blockquote>
 * - prefer longer phrases first to avoid partial overlap
 */

export type LinkTarget = {
  href: string;
  /** ordered phrases — longest first wins */
  phrases: string[];
  kind?: "post" | "category" | "tool" | "workflow";
};

const SKIP_TAGS = ["a", "h1", "h2", "h3", "h4", "code", "pre", "blockquote"];

export function injectInternalLinks(
  html: string,
  targets: LinkTarget[],
  opts: { max?: number } = {},
): string {
  const max = opts.max ?? 6;
  let injected = 0;
  // sort by longest phrase desc to prefer specific matches
  const sorted = targets
    .map((t) => ({ ...t, phrases: [...t.phrases].sort((a, b) => b.length - a.length) }))
    .sort((a, b) => Math.max(...b.phrases.map((p) => p.length)) - Math.max(...a.phrases.map((p) => p.length)));

  let out = html;
  for (const t of sorted) {
    if (injected >= max) break;
    for (const phrase of t.phrases) {
      if (injected >= max) break;
      if (!phrase || phrase.length < 4) continue;
      const re = new RegExp(`(?<![\\w-])(${escapeReg(phrase)})(?![\\w-])`, "i");
      const replaced = replaceOutsideSkip(out, re, (m) =>
        `<a href="${t.href}" data-internal="${t.kind ?? "post"}">${m}</a>`,
      );
      if (replaced.changed) {
        out = replaced.html;
        injected++;
        break; // one phrase per target only
      }
    }
  }
  return out;
}

function escapeReg(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/**
 * Walk the HTML linearly, tracking open tags. Replace first match of `re`
 * that occurs OUTSIDE skip-list tags. Returns a new string and a flag.
 */
function replaceOutsideSkip(
  html: string,
  re: RegExp,
  wrap: (match: string) => string,
): { html: string; changed: boolean } {
  const stack: string[] = [];
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  let cursor = 0;
  let result = "";
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) {
    const text = html.slice(cursor, m.index);
    const inSkip = stack.some((t) => SKIP_TAGS.includes(t));
    if (!inSkip) {
      const localMatch = re.exec(text);
      if (localMatch) {
        const before = text.slice(0, localMatch.index);
        const matched = localMatch[0];
        const after = text.slice(localMatch.index + matched.length);
        result += before + wrap(matched) + after + m[0];
        cursor = m.index + m[0].length;
        // append the rest unchanged
        result += html.slice(cursor);
        return { html: result, changed: true };
      }
    }
    result += text + m[0];
    cursor = m.index + m[0].length;
    const tag = m[0];
    const tagName = m[1].toLowerCase();
    if (tag.startsWith("</")) {
      const idx = stack.lastIndexOf(tagName);
      if (idx >= 0) stack.splice(idx, 1);
    } else if (!tag.endsWith("/>") && !["img", "br", "hr"].includes(tagName)) {
      stack.push(tagName);
    }
  }
  // tail
  const tail = html.slice(cursor);
  const inSkip = stack.some((t) => SKIP_TAGS.includes(t));
  if (!inSkip) {
    const localMatch = re.exec(tail);
    if (localMatch) {
      const before = tail.slice(0, localMatch.index);
      const matched = localMatch[0];
      const after = tail.slice(localMatch.index + matched.length);
      return { html: result + before + wrap(matched) + after, changed: true };
    }
  }
  return { html: result + tail, changed: false };
}

/**
 * Build link targets from the related posts / category / cross-app workflows
 * surfaced by the blog-post edge function.
 */
export function buildLinkTargets(opts: {
  related?: { slug: string; title: string }[];
  category?: { slug: string; title: string };
  workflows?: string[];
  tools?: string[];
  /** Operational authority systems on the main domain (slug → label). */
  systems?: { slug: string; title: string }[];
}): LinkTarget[] {
  const targets: LinkTarget[] = [];
  // 3–5 related posts (most specific) come first.
  for (const r of (opts.related ?? []).slice(0, 5)) {
    if (!r?.slug || !r?.title) continue;
    targets.push({
      href: `/${r.slug}`,
      kind: "post",
      phrases: phrasesFromTitle(r.title),
    });
  }
  if (opts.category?.slug && opts.category?.title) {
    targets.push({
      href: `/category/${opts.category.slug}`,
      kind: "category",
      phrases: [opts.category.title],
    });
  }
  for (const s of opts.systems ?? []) {
    if (!s?.slug) continue;
    targets.push({
      href: `https://hustlaiapp.in/systems/${s.slug}`,
      kind: "workflow",
      phrases: [s.title, s.slug.replace(/-/g, " ")],
    });
  }
  for (const w of opts.workflows ?? []) {
    targets.push({
      href: `https://hustlaiapp.in/workflows/${w}`,
      kind: "workflow",
      phrases: [w.replace(/-/g, " ")],
    });
  }
  for (const t of opts.tools ?? []) {
    targets.push({
      href: `https://hustlaiapp.in/free-tools/${t}`,
      kind: "tool",
      phrases: [t.replace(/-/g, " ")],
    });
  }
  return targets;
}

function phrasesFromTitle(title: string): string[] {
  const t = title.replace(/[—–:|].*$/, "").trim();
  const phrases = [t];
  // also try "noun phrase" version (drop leading "How to ", "The ", etc.)
  const stripped = t.replace(/^(how to|why|the|a|an|guide to|best)\s+/i, "");
  if (stripped.length >= 6 && stripped !== t) phrases.push(stripped);
  return phrases;
}