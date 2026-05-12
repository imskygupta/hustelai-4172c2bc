import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/** Sticky mobile-only CTA bar. Appears after scroll, respects safe-area inset. */
export function StickyMobileCTA({
  href = "/signup",
  label = "Start free workspace",
  hint = "Free to start · no card",
  showAfter = 480,
}: {
  href?: string;
  label?: string;
  hint?: string;
  showAfter?: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > showAfter);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [showAfter]);
  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="rounded-2xl bg-slate-900/95 backdrop-blur border border-white/10 shadow-2xl shadow-black/30 px-3 py-2.5 flex items-center gap-2">
        <div className="flex-1 min-w-0 pl-1">
          <div className="text-[11px] text-emerald-300 leading-tight">{hint}</div>
          <div className="text-sm font-medium text-white truncate leading-tight">{label}</div>
        </div>
        <Link
          to={href}
          className="bg-emerald-500 hover:bg-emerald-600 text-white h-9 px-4 rounded-xl inline-flex items-center text-sm font-medium"
        >
          Open <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Link>
      </div>
    </div>
  );
}