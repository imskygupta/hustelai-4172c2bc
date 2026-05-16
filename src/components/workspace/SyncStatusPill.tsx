/**
 * SyncStatusPill — tiny ambient persistence indicator.
 *
 * Communicates the lifecycle of a deliverable: drafting → drafted →
 * auto-saved → synced → memory updated. Calm, monochrome, never demands
 * attention. Used inside IntentRunner footer and anywhere we want to make
 * persistence feel real ("your operations are safe").
 */
import { CheckCircle2, Loader2, CloudUpload, Brain, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type SyncPhase =
  | "idle"
  | "drafting"
  | "drafted"
  | "saving"
  | "saved"
  | "synced"
  | "memory"
  | "error";

const PHASE: Record<SyncPhase, { label: string; Icon: any; tone: string; pulse?: boolean }> = {
  idle:     { label: "Ready",            Icon: CheckCircle2, tone: "text-muted-foreground" },
  drafting: { label: "Drafting",         Icon: Loader2,      tone: "text-emerald-500/90", pulse: true },
  drafted:  { label: "Draft ready",      Icon: CheckCircle2, tone: "text-emerald-500/90" },
  saving:   { label: "Auto-saving",      Icon: CloudUpload,  tone: "text-emerald-500/90", pulse: true },
  saved:    { label: "Auto-saved",       Icon: CheckCircle2, tone: "text-emerald-500" },
  synced:   { label: "Synced to project",Icon: CloudUpload,  tone: "text-emerald-500" },
  memory:   { label: "Memory updated",   Icon: Brain,        tone: "text-emerald-500" },
  error:    { label: "Save failed",      Icon: AlertTriangle,tone: "text-destructive" },
};

export function SyncStatusPill({ phase, hint }: { phase: SyncPhase; hint?: string }) {
  const { label, Icon, tone, pulse } = PHASE[phase];
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={phase}
        initial={{ opacity: 0, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -2 }}
        transition={{ duration: 0.18 }}
        className="inline-flex items-center gap-1.5 text-[10.5px] font-medium tracking-tight text-muted-foreground"
      >
        <span className="relative inline-flex items-center justify-center h-3.5 w-3.5">
          {pulse && (
            <span className="absolute inline-flex h-2 w-2 rounded-full bg-emerald-500/40 animate-ping" />
          )}
          <Icon className={`h-3 w-3 ${tone} ${phase === "drafting" || phase === "saving" ? "animate-spin" : ""}`} />
        </span>
        <span className={tone}>{label}</span>
        {hint && <span className="text-muted-foreground/60">· {hint}</span>}
      </motion.span>
    </AnimatePresence>
  );
}
