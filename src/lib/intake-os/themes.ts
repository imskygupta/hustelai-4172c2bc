export type IntakeThemeId = "minimal" | "cinematic" | "startup" | "corporate" | "luxury" | "agency";

export type IntakeTheme = {
  id: IntakeThemeId;
  name: string;
  bg: string;          // tailwind classes for the page background
  card: string;        // tailwind classes for the form card
  heading: string;     // heading classes
  accent: string;      // primary accent color class for buttons/badges
  description?: string;
};

export const INTAKE_THEMES: IntakeTheme[] = [
  {
    id: "minimal",
    name: "Minimal",
    bg: "bg-background",
    card: "bg-card border border-border rounded-2xl shadow-sm",
    heading: "text-3xl font-semibold tracking-tight text-foreground",
    accent: "bg-primary text-primary-foreground",
    description: "Clean, neutral, distraction-free",
  },
  {
    id: "cinematic",
    name: "Cinematic",
    bg: "bg-gradient-to-br from-background via-background to-primary/10",
    card: "bg-card/80 backdrop-blur border border-primary/20 rounded-3xl shadow-2xl shadow-primary/10",
    heading: "text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent",
    accent: "bg-gradient-to-r from-primary to-primary/70 text-primary-foreground",
    description: "Bold, gradient, hero-style",
  },
  {
    id: "startup",
    name: "Startup",
    bg: "bg-gradient-to-b from-background to-muted/40",
    card: "bg-card border border-border rounded-2xl shadow-xl shadow-black/5",
    heading: "text-3xl font-semibold tracking-tight",
    accent: "bg-foreground text-background",
    description: "YC-style, confident, fast",
  },
  {
    id: "corporate",
    name: "Corporate",
    bg: "bg-muted/30",
    card: "bg-card border-2 border-border rounded-lg shadow-md",
    heading: "text-2xl font-semibold tracking-tight uppercase",
    accent: "bg-primary text-primary-foreground rounded-md",
    description: "Formal, structured, trust-first",
  },
  {
    id: "luxury",
    name: "Luxury",
    bg: "bg-gradient-to-br from-background to-amber-950/10",
    card: "bg-card border border-amber-500/20 rounded-3xl shadow-2xl shadow-amber-500/5",
    heading: "text-4xl font-light tracking-wider text-foreground",
    accent: "bg-amber-500/90 text-background hover:bg-amber-500",
    description: "Premium, refined, gold-touched",
  },
  {
    id: "agency",
    name: "Agency",
    bg: "bg-foreground",
    card: "bg-background border border-foreground/10 rounded-2xl shadow-2xl",
    heading: "text-3xl font-bold tracking-tight",
    accent: "bg-primary text-primary-foreground",
    description: "Bold inverted, creative agency vibe",
  },
];

export function getIntakeTheme(id?: string | null): IntakeTheme {
  return INTAKE_THEMES.find(t => t.id === id) || INTAKE_THEMES[0];
}