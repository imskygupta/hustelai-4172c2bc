// Tiny pub/sub for AI fill UI feedback (status banner / per-section overlay).
export type AIFillStatus = "writing" | "exhausted" | "error" | "done" | "idle";

export type AIFillEvent = {
  status: AIFillStatus;
  section?: string;
  message?: string;
};

type Listener = (e: AIFillEvent) => void;
const listeners = new Set<Listener>();

export function emitAIFill(e: AIFillEvent) {
  listeners.forEach((l) => {
    try { l(e); } catch {}
  });
}

export function onAIFill(fn: Listener) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}