import type { ThemeId } from "./types";

export interface ThemeTokens {
  id: ThemeId;
  name: string;
  preview: string;
  bg: string;          // page background (CSS)
  surface: string;     // card surface
  text: string;        // primary text
  muted: string;       // secondary text
  accent: string;      // accent / brand
  border: string;
  font: string;        // CSS font stack
  display: string;     // display heading font stack
  divider: string;
  badgeBg: string;
  badgeText: string;
}

export const THEMES: Record<ThemeId, ThemeTokens> = {
  "minimal-dark": {
    id: "minimal-dark",
    name: "Minimal Dark",
    preview: "linear-gradient(135deg,#0a0a0a 0%,#171717 100%)",
    bg: "#0a0a0a",
    surface: "#111111",
    text: "#fafafa",
    muted: "#a1a1aa",
    accent: "#ffffff",
    border: "#27272a",
    font: "'Inter', system-ui, sans-serif",
    display: "'Inter', system-ui, sans-serif",
    divider: "#27272a",
    badgeBg: "#fafafa",
    badgeText: "#0a0a0a",
  },
  "glass-gradient": {
    id: "glass-gradient",
    name: "Glass Gradient",
    preview: "linear-gradient(135deg,#7c3aed 0%,#06b6d4 50%,#ec4899 100%)",
    bg: "linear-gradient(135deg,#1e1b4b 0%,#0c4a6e 50%,#831843 100%)",
    surface: "rgba(255,255,255,0.06)",
    text: "#ffffff",
    muted: "rgba(255,255,255,0.7)",
    accent: "#22d3ee",
    border: "rgba(255,255,255,0.12)",
    font: "'Inter', system-ui, sans-serif",
    display: "'Inter', system-ui, sans-serif",
    divider: "rgba(255,255,255,0.1)",
    badgeBg: "rgba(255,255,255,0.15)",
    badgeText: "#ffffff",
  },
  "corporate-clean": {
    id: "corporate-clean",
    name: "Corporate Clean",
    preview: "linear-gradient(135deg,#ffffff 0%,#e5e7eb 100%)",
    bg: "#ffffff",
    surface: "#ffffff",
    text: "#0f172a",
    muted: "#64748b",
    accent: "#1d4ed8",
    border: "#e2e8f0",
    font: "'Inter', system-ui, sans-serif",
    display: "'Inter', system-ui, sans-serif",
    divider: "#e2e8f0",
    badgeBg: "#1d4ed8",
    badgeText: "#ffffff",
  },
  "creative-studio": {
    id: "creative-studio",
    name: "Creative Studio",
    preview: "linear-gradient(135deg,#fef3c7 0%,#fb923c 100%)",
    bg: "#fff8e1",
    surface: "#ffffff",
    text: "#1c1917",
    muted: "#78716c",
    accent: "#ea580c",
    border: "#fed7aa",
    font: "'Inter', system-ui, sans-serif",
    display: "'Playfair Display', 'Georgia', serif",
    divider: "#fed7aa",
    badgeBg: "#ea580c",
    badgeText: "#fff8e1",
  },
  "cyber-neon": {
    id: "cyber-neon",
    name: "Cyber Neon",
    preview: "linear-gradient(135deg,#020617 0%,#1e1b4b 50%,#a21caf 100%)",
    bg: "radial-gradient(at 30% 20%,#1e1b4b 0%,#020617 60%)",
    surface: "rgba(15,23,42,0.7)",
    text: "#f0abfc",
    muted: "#a5b4fc",
    accent: "#22d3ee",
    border: "#7c3aed",
    font: "'JetBrains Mono', 'Courier New', monospace",
    display: "'JetBrains Mono', 'Courier New', monospace",
    divider: "#7c3aed",
    badgeBg: "#22d3ee",
    badgeText: "#020617",
  },
};

export const THEME_LIST = Object.values(THEMES);