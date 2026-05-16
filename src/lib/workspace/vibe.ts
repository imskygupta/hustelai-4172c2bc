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
  | "ivory"     // warm cream + soft peach
  | "mint"      // fresh mint freelancer
  | "lavender"  // soft violet operator
  | "sky"       // powder blue agency
  | "peach"     // sunrise peach
  | "rose";     // dusty rose studio

export type VibeProviderTone = "claude" | "groq" | "gemini" | "openai" | "neutral";

export interface Vibe {
  id: VibeId;
  intensity: number;       // 0..100 — ambient glow strength
  focus: boolean;          // dim ambient + slow motion
  reducedMotion: boolean;  // hard-disable motion
}

export const VIBE_PRESETS: { id: VibeId; name: string; tagline: string; swatch: string[] }[] = [
  { id: "ivory",    name: "Ivory Cream",   tagline: "Warm, calm, daylight",     swatch: ["#FFFBEF", "#FFF3D6", "#FDE9C2", "#F4DCA8"] },
  { id: "mint",     name: "Fresh Mint",    tagline: "Freelancer freshness",     swatch: ["#F1FBF4", "#DDF5E4", "#BCEBC9", "#86D9A0"] },
  { id: "lavender", name: "Soft Lavender", tagline: "Calm operator focus",      swatch: ["#F6F2FF", "#E9DEFF", "#D5C3FB", "#B89AF1"] },
  { id: "sky",      name: "Powder Sky",    tagline: "Cool agency clarity",      swatch: ["#F0F7FF", "#DDECFF", "#BBD7FB", "#8FBCF1"] },
  { id: "peach",    name: "Sunrise Peach", tagline: "Warm shipping energy",     swatch: ["#FFF5EC", "#FFE6D1", "#FFCDA8", "#FBA677"] },
  { id: "rose",     name: "Dusty Rose",    tagline: "Studio-grade warmth",      swatch: ["#FFF1F4", "#FFE0E6", "#FBC4CD", "#F19BAA"] },
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
