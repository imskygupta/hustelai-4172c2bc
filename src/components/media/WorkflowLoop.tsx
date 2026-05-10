import { useEffect, useRef, useState } from "react";

/**
 * <WorkflowLoop>
 * --------------------------------------------------------------
 * Drop-in ambient cinematic loop player for the marketing site.
 *
 * Designed for short (8–12s) muted, looping SaaS workflow loops
 * (Veo / Runway / Kling output). Honors:
 *   - muted autoplay (works on iOS/Android)
 *   - IntersectionObserver lazy-load (no network until visible)
 *   - poster fallback while loading or if video disabled
 *   - prefers-reduced-motion → static poster only
 *   - data-saver / slow-2g → static poster only
 *   - graceful no-asset state (renders an elegant gradient skeleton)
 *
 * Usage:
 *   <WorkflowLoop
 *     srcMp4="/loops/hero-workflow.mp4"
 *     srcWebm="/loops/hero-workflow.webm"
 *     poster="/loops/hero-workflow.jpg"
 *     aspect="16/9"
 *     label="AI workspace operating in the background"
 *   />
 *
 * If srcMp4/srcWebm are omitted, the component renders the calm
 * gradient placeholder — safe to ship before assets are produced.
 */

type Props = {
  srcMp4?: string;
  srcWebm?: string;
  poster?: string;
  /** CSS aspect-ratio string, e.g. "16/9", "4/3", "9/16" */
  aspect?: string;
  /** Subtle rounding & shadow tier */
  variant?: "card" | "bare";
  /** Accessible label */
  label?: string;
  className?: string;
};

function shouldDisableMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    const conn = (navigator as any).connection;
    if (conn?.saveData) return true;
    if (conn?.effectiveType && /(^|-)2g$/.test(conn.effectiveType)) return true;
  } catch {
    // ignore
  }
  return false;
}

export function WorkflowLoop({
  srcMp4,
  srcWebm,
  poster,
  aspect = "16/9",
  variant = "card",
  label,
  className = "",
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const [errored, setErrored] = useState(false);

  const hasSource = Boolean(srcMp4 || srcWebm);
  const motionAllowed = !shouldDisableMotion();
  const shouldRenderVideo = hasSource && motionAllowed && !errored;

  // Lazy mount via IntersectionObserver
  useEffect(() => {
    if (!shouldRenderVideo || !wrapRef.current) return;
    const node = wrapRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px 0px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [shouldRenderVideo]);

  // Pause when off-screen to save CPU/battery
  useEffect(() => {
    if (!visible || !videoRef.current) return;
    const v = videoRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        }
      },
      { threshold: 0.15 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, [visible]);

  const radius = variant === "card" ? "rounded-2xl md:rounded-3xl" : "rounded-none";
  const shadow =
    variant === "card"
      ? "ring-1 ring-slate-200/70 shadow-xl shadow-slate-200/60"
      : "";

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden bg-slate-950 ${radius} ${shadow} ${className}`}
      style={{ aspectRatio: aspect }}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      {/* Calm gradient placeholder — always present as the bottom layer */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 10%, rgba(16,185,129,0.18), transparent 55%), radial-gradient(ellipse at 85% 90%, rgba(56,189,248,0.12), transparent 50%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Poster image while video loads or when video is disabled */}
      {poster && (
        <img
          src={poster}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            canPlay && shouldRenderVideo ? "opacity-0" : "opacity-100"
          }`}
        />
      )}

      {/* Video — mounted only when in viewport */}
      {shouldRenderVideo && visible && (
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            canPlay ? "opacity-100" : "opacity-0"
          }`}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          onCanPlay={() => setCanPlay(true)}
          onError={() => setErrored(true)}
        >
          {srcWebm && <source src={srcWebm} type="video/webm" />}
          {srcMp4 && <source src={srcMp4} type="video/mp4" />}
        </video>
      )}

      {/* Soft top + bottom vignette for legibility when overlaying text */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-slate-950/10 pointer-events-none"
      />
    </div>
  );
}

/* --------------------------------------------------------------
 * Loop registry — central source of truth for asset paths so
 * we can swap files (or A/B test) in one place.
 *
 * Drop your generated assets into /public/loops/ with these names
 * and they will appear automatically across the marketing site.
 * Until then, the calm gradient placeholder is shown.
 * -------------------------------------------------------------- */
export const LOOPS = {
  hero: {
    srcMp4: "/loops/hero-workflow.mp4",
    srcWebm: "/loops/hero-workflow.webm",
    poster: "/loops/hero-workflow.jpg",
  },
  exports: {
    srcMp4: "/loops/exports-delivery.mp4",
    srcWebm: "/loops/exports-delivery.webm",
    poster: "/loops/exports-delivery.jpg",
  },
  workspace: {
    srcMp4: "/loops/workspace-flow.mp4",
    srcWebm: "/loops/workspace-flow.webm",
    poster: "/loops/workspace-flow.jpg",
  },
  integrations: {
    srcMp4: "/loops/integrations.mp4",
    srcWebm: "/loops/integrations.webm",
    poster: "/loops/integrations.jpg",
  },
  mobile: {
    srcMp4: "/loops/mobile-async.mp4",
    srcWebm: "/loops/mobile-async.webm",
    poster: "/loops/mobile-async.jpg",
  },
} as const;