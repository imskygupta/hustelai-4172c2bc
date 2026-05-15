/**
 * WorkspaceHandoff — fade-through transition overlay shown when a user
 * launches into the workspace surface (cross-host or in-app).
 *
 * Goal: make the jump feel like "going deeper into the same product"
 * instead of a hard teleport. Mounted on demand by the dashboard launcher;
 * displays for the brief window between click and the new surface painting.
 *
 * Keep this LIGHT — no data, no router, no providers. Just visual chrome.
 */
import { Sparkles } from "lucide-react";

export function WorkspaceHandoff({ tool }: { tool?: string }) {
  return (
    <div
      className="fixed inset-0 z-[100] ws-handoff-enter flex items-center justify-center bg-[hsl(222_22%_5%)]/92 backdrop-blur-md"
      aria-live="polite"
      role="status"
    >
      {/* ambient glow */}
      <div aria-hidden className="absolute -top-40 -right-32 w-[640px] h-[640px] rounded-full bg-emerald-500/[0.08] blur-[160px]" />
      <div aria-hidden className="absolute -bottom-52 -left-40 w-[640px] h-[640px] rounded-full bg-violet-500/[0.08] blur-[160px]" />

      <div className="relative flex flex-col items-center gap-5 px-6 text-center">
        <div className="ws-handoff-pulse w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-violet-500 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.35)]">
          <Sparkles className="w-6 h-6 text-emerald-950" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/80 mb-1.5">
            Opening Workspace
          </div>
          <div className="text-lg font-semibold text-white tracking-tight">
            {tool || "Launching your tool"}
          </div>
        </div>
        <div className="w-48 h-[3px] rounded-full overflow-hidden bg-white/[0.06]">
          <div className="h-full w-1/2 ws-shimmer rounded-full" style={{ background: "var(--ws-gradient)" }} />
        </div>
      </div>
    </div>
  );
}
