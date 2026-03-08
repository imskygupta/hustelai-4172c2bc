import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "scale";
}

export function ScrollReveal({ children, className = "", delay = 0, direction = "up" }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const from: gsap.TweenVars = { opacity: 0 };
    const to: gsap.TweenVars = {
      opacity: 1,
      duration: 0.8,
      delay,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ref.current,
        start: "top 85%",
        toggleActions: "play none none none",
      },
    };

    switch (direction) {
      case "up": from.y = 50; to.y = 0; break;
      case "left": from.x = -50; to.x = 0; break;
      case "right": from.x = 50; to.x = 0; break;
      case "scale": from.scale = 0.9; to.scale = 1; break;
    }

    gsap.fromTo(ref.current, from, to);

    return () => {
      ScrollTrigger.getAll().forEach(t => {
        if (t.trigger === ref.current) t.kill();
      });
    };
  }, [delay, direction]);

  return (
    <div ref={ref} className={className} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
