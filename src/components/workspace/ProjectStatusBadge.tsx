import { STATUS_META, type ProjectStatus } from "@/lib/workspace/governance";

/**
 * Professional status pill — replaces generic "active/inactive".
 * Renders a quiet dot + label using the governance vocabulary.
 */
export function ProjectStatusBadge({
  status,
  size = "sm",
  className = "",
}: {
  status: ProjectStatus;
  size?: "xs" | "sm";
  className?: string;
}) {
  const meta = STATUS_META[status] || STATUS_META.planning;
  const pad = size === "xs" ? "px-1.5 py-0.5 text-[9.5px]" : "px-2 py-0.5 text-[10.5px]";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-[0.14em] ${pad} ${meta.tint} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}