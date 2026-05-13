import { ArrowRight, Sparkles, Wrench } from "lucide-react";

type ToolMatch = { slug: string; title: string; href: string; summary?: string };
type Template = { slug: string; title: string; href: string; label?: string };

/**
 * Editorial conversion block — renders inside an article to bridge the reader
 * from "this is interesting" to "open the workflow inside HustleAI".
 *
 * Shows a primary CTA (template) plus 2-4 supporting tools.
 */
export function HustleConversionBlock({
  template,
  tools = [],
  variant = "inline",
  onCta,
}: {
  template?: Template | null;
  tools?: ToolMatch[];
  variant?: "inline" | "terminal";
  onCta?: (kind: string, href: string) => void;
}) {
  if (!template && (!tools || tools.length === 0)) return null;
  const primaryHref = template?.href
    ? (template.href.startsWith("http") ? template.href : `https://hustlaiapp.in${template.href}`)
    : (tools[0]?.href ?? "https://hustlaiapp.in/explore");
  const supporting = tools.slice(0, 3);

  return (
    <aside
      className={`my-10 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.06] via-background to-transparent p-5 sm:p-6 ${variant === "terminal" ? "ring-1 ring-emerald-500/10" : ""}`}
      aria-label="Use this inside HustleAI"
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400 mb-3">
        <Sparkles className="h-3 w-3" />
        {variant === "terminal" ? "Run this workflow" : "Ready-to-use workflow"}
      </div>
      {template && (
        <a
          href={primaryHref}
          onClick={() => onCta?.("template", primaryHref)}
          className="group block rounded-lg border border-border/60 bg-background/70 px-4 py-3 mb-3 hover:border-emerald-500/50 transition"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-serif text-[18px] leading-tight">{template.title}</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">Loads prompt, tools, and presets in your workspace.</div>
            </div>
            <div className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
              {template.label || "Open"} <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </a>
      )}
      {supporting.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-2">
          {supporting.map((t) => (
            <a
              key={t.slug}
              href={t.href.startsWith("http") ? t.href : `https://hustlaiapp.in${t.href}`}
              onClick={() => onCta?.("tool", t.href)}
              className="rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm hover:border-foreground/40 transition group"
            >
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
                <Wrench className="h-2.5 w-2.5" /> Tool
              </div>
              <div className="text-[13.5px] font-medium leading-snug mt-0.5 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                {t.title}
              </div>
            </a>
          ))}
        </div>
      )}
    </aside>
  );
}