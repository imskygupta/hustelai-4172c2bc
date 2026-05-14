import { useEffect, useState } from "react";
import { Waves, Zap } from "lucide-react";

const KEY = "hai.calm";

function apply(v: boolean) {
  const root = document.documentElement;
  if (v) root.classList.add("calm");
  else root.classList.remove("calm");
}

export function getInitialCalm(): boolean {
  try {
    if (localStorage.getItem(KEY) === "1") return true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  } catch { /* ignore */ }
  return false;
}

/** Apply persisted calm mode synchronously — call once at boot. */
export function initCalmMode() {
  apply(getInitialCalm());
}

export function CalmModeToggle({ className = "" }: { className?: string }) {
  const [calm, setCalm] = useState<boolean>(() => getInitialCalm());

  useEffect(() => {
    apply(calm);
    try { localStorage.setItem(KEY, calm ? "1" : "0"); } catch { /* ignore */ }
  }, [calm]);

  return (
    <button
      onClick={() => setCalm(c => !c)}
      aria-label={calm ? "Disable calm mode" : "Enable calm mode"}
      title={calm ? "Calm mode on — gradients & motion reduced" : "Calm mode — softer surfaces, reduced motion"}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition ${className}`}
    >
      {calm ? <Waves className="w-4 h-4 text-primary" /> : <Zap className="w-4 h-4" />}
    </button>
  );
}