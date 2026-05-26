import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Sequentially activates stage children of a container as it enters the
 * viewport. Each child receives data-stage-active="true" with a small
 * stagger, letting CSS animate chip glow, icon swap, and connector flow.
 *
 * Calm and one-shot — no scroll hijack, no scrub. Respects prefers-reduced-motion.
 */
export function useStageActivation(count: number, opts: { stagger?: number; start?: string } = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const { stagger = 0.18, start = "top 78%" } = opts;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stages = Array.from(el.querySelectorAll<HTMLElement>("[data-stage]"));
    if (stages.length === 0) return;

    if (reduce) {
      stages.forEach((s) => s.setAttribute("data-stage-active", "true"));
      return;
    }

    const trigger = ScrollTrigger.create({
      trigger: el,
      start,
      once: true,
      onEnter: () => {
        stages.forEach((s, i) => {
          gsap.delayedCall(i * stagger, () => s.setAttribute("data-stage-active", "true"));
        });
      },
    });

    return () => {
      trigger.kill();
    };
  }, [count, stagger, start]);

  return ref;
}