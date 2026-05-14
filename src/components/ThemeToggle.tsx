import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "hai.theme";

function applyTheme(t: "light" | "dark") {
  const root = document.documentElement;
  if (t === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function getInitialTheme(): "light" | "dark" {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") return saved;
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  } catch { /* ignore */ }
  return "light";
}

/** Synchronously apply persisted theme — call once at boot. */
export function initTheme() {
  applyTheme(getInitialTheme());
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">(() => getInitialTheme());

  useEffect(() => { applyTheme(theme); try { localStorage.setItem(KEY, theme); } catch {} }, [theme]);

  return (
    <button
      onClick={() => setTheme(t => (t === "dark" ? "light" : "dark"))}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition ${className}`}
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
