import { Moon } from "lucide-react";
import { toast } from "sonner";

/**
 * Dark mode is currently paused — the toggle stays visible for continuity
 * but clicking it surfaces a maintenance toast instead of switching themes.
 * Re-enable by restoring the previous applyTheme/localStorage logic.
 */
export function getInitialTheme(): "light" {
  return "light";
}

export function initTheme() {
  try { document.documentElement.classList.remove("dark"); } catch { /* ignore */ }
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  return (
    <button
      onClick={() =>
        toast("Dark mode is currently under maintenance.", {
          description: "We're polishing it. Light mode only for now.",
        })
      }
      aria-label="Dark mode (under maintenance)"
      title="Dark mode is under maintenance"
      className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition ${className}`}
    >
      <Moon className="w-4 h-4" />
    </button>
  );
}
