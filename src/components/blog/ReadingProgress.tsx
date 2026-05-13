import { useEffect, useState } from "react";

/** Thin emerald progress bar pinned under the sticky header. */
export function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = document.documentElement;
        const total = h.scrollHeight - h.clientHeight;
        setPct(total > 0 ? Math.min(100, Math.max(0, (h.scrollTop / total) * 100)) : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <div aria-hidden className="fixed top-14 left-0 right-0 z-40 h-[2px] bg-transparent pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500/80 transition-[width] duration-150"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
