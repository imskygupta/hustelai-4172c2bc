/**
 * Workspace Vibe — per-user ambient theme for the workspace cockpit.
 *
 * Stored locally (per device) so palette switches feel instant. The user
 * can later opt into syncing across devices; we keep the API future-proof
 * by exporting load/save through this single module.
 *
 * The active palette + intensity + focus + reduced-motion are projected
 * onto a wrapper element via data-* attributes that workspace.css reads.
 * Provider aura ("AI atmosphere") is layered on top by data-ws-provider.
 */
import { useEffect, useState, useCallback } from "react";

export type VibeId =
  | "ivory"          // default warm operator
  | "midnight"       // midnight emerald
  | "graphite"       // deep graphite
  | "aurora"         // aurora pastels
  | "violet"         // neural violet
  | "obsidian";      // obsidian glass (near-black)

export type VibeProviderTone = "claude" | "groq" | "gemini" | "openai" | "neutral";

export interface Vibe {
  id: VibeId;
  intensity: number;       // 0..100 — ambient glow strength
  focus: boolean;          // dim ambient + slow motion
  reducedMotion: boolean;  // hard-disable motion
}

export const VIBE_PRESETS: { id: VibeId; name: string; tagline: string; swatch: string[] }[] = [
  { id: "ivory",    name: "Ivory Operator",  tagline: "Warm, calm, daylight",   swatch: ["#FFFBEF", "#FFF3D6", "#F4DCA8", "#1f2937"] },
  { id: "midnight", name: "Midnight Emerald", tagline: "Deep green focus",       swatch: ["#06120E", "#0E2A22", "#10b981", "#34d399"] },
  { id: "graphite", name: "Deep Graphite",    tagline: "Quiet, neutral, sharp",  swatch: ["#0E1014", "#1A1D24", "#373C46", "#94a3b8"] },
  { id: "aurora",   name: "Aurora",           tagline: "Soft northern pastels",  swatch: ["#0B1228", "#13284A", "#5cbdb9", "#a78bfa"] },
  { id: "violet",   name: "Neural Violet",    tagline: "Late-night invention",   swatch: ["#0B0716", "#1B1235", "#6d28d9", "#c4b5fd"] },
  { id: "obsidian", name: "Obsidian Glass",   tagline: "Cinematic black",        swatch: ["#050507", "#0E0E12", "#1F1F26", "#e5e7eb"] },
];

const DEFAULT_VIBE: Vibe = { id: "ivory", intensity: 55, focus: false, reducedMotion: false };
const KEY = "ws.vibe.v1";

function read(): Vibe {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_VIBE;
    const parsed = JSON.parse(raw) as Partial<Vibe>;
    return { ...DEFAULT_VIBE, ...parsed };
  } catch { return DEFAULT_VIBE; }
}

function write(v: Vibe) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ }
}

const EVT = "ws-vibe-change";

export function useWorkspaceVibe() {
  const [vibe, setVibe] = useState<Vibe>(() => read());

  useEffect(() => {
    const onChange = () => setVibe(read());
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const update = useCallback((patch: Partial<Vibe>) => {
    const next = { ...read(), ...patch };
    write(next);
    setVibe(next);
    window.dispatchEvent(new CustomEvent(EVT));
  }, []);

  return { vibe, update };
}

/** Map a provider id (from useWorkspace().activeProvider.provider) → aura tone. */
export function providerToTone(provider?: string | null): VibeProviderTone {
  if (!provider) return "neutral";
  const p = provider.toLowerCase();
  if (p.includes("claude") || p.includes("anthropic")) return "claude";
  if (p.includes("groq")) return "groq";
  if (p.includes("gemini") || p.includes("google")) return "gemini";
  if (p.includes("openai") || p.includes("gpt")) return "openai";
  return "neutral";
}
