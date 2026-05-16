import { Cpu, GitBranch, RefreshCcw, Link2 } from "lucide-react";
import { PROVIDER_DISPLAY } from "@/lib/workspace/toolsCatalog";
import { intentLabel } from "@/lib/workspace/governance";

/**
 * Tiny provenance chip set for a workspace output. Quietly answers:
 *   - which provider produced this
 *   - what workflow it came from (chain_origin / source_workflow)
 *   - whether it's a regenerated version
 *   - whether it's linked to an export
 *
 * Built for inline use under titles / list rows — never a full panel.
 */
export function OutputProvenance({
  provider, model, metadata, refKind,
  size = "xs",
}: {
  provider?: string | null;
  model?: string | null;
  metadata?: Record<string, any> | null;
  refKind?: string | null;
  size?: "xs" | "sm";
}) {
  const p = provider ? PROVIDER_DISPLAY[provider] : null;
  const origin = metadata?.chain_origin || metadata?.source_workflow;
  const version = Number(metadata?.version || metadata?.regen_count || 0);
  const exported = refKind === "export" || !!metadata?.exported;
  const pad = size === "xs" ? "text-[9.5px] px-1.5 py-0.5" : "text-[10.5px] px-2 py-0.5";

  return (
    <div className="inline-flex items-center gap-1 flex-wrap">
      {p && (
        <span className={`inline-flex items-center gap-1 rounded border font-semibold ${pad} ${p.tint}`} title={model || p.label}>
          <Cpu className="h-2.5 w-2.5" /> {p.label}
        </span>
      )}
      {origin && (
        <span className={`inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 text-muted-foreground ${pad}`} title={`From ${intentLabel(origin)}`}>
          <GitBranch className="h-2.5 w-2.5" /> {intentLabel(origin)}
        </span>
      )}
      {version > 0 && (
        <span className={`inline-flex items-center gap-1 rounded border border-violet-300/40 bg-violet-50/40 text-violet-700 dark:text-violet-300 ${pad}`} title="Regenerated">
          <RefreshCcw className="h-2.5 w-2.5" /> v{version + 1}
        </span>
      )}
      {exported && (
        <span className={`inline-flex items-center gap-1 rounded border border-emerald-300/40 bg-emerald-50/40 text-emerald-700 dark:text-emerald-300 ${pad}`} title="Linked export">
          <Link2 className="h-2.5 w-2.5" /> Export linked
        </span>
      )}
    </div>
  );
}