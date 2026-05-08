import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, EyeOff, Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Tiny animated cat companion — bottom-left of the screen.
 * Pure-algo, hardcoded copy. Triggers on time of day, route changes
 * and idle. Persistent enable/disable in localStorage.
 */
const ENABLED_KEY = "hustleai_mascot_enabled_v1";
const LAST_GREET_KEY = "hustleai_mascot_last_greet_v1";

export function isMascotEnabled() {
  try { return localStorage.getItem(ENABLED_KEY) !== "0"; } catch { return true; }
}
export function setMascotEnabled(v: boolean) {
  try { localStorage.setItem(ENABLED_KEY, v ? "1" : "0"); } catch {}
  window.dispatchEvent(new CustomEvent("mascot:toggle", { detail: v }));
}

function partOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const h = new Date().getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 22) return "evening";
  return "night";
}

function pickFrom<T,>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function greetingFor(name: string) {
  const tod = partOfDay();
  const decks: Record<string, string[]> = {
    morning: [
      `Good morning, ${name}! ☀️ Let's make today count.`,
      `Morning ${name}! Coffee first, then world domination?`,
      `Hey ${name}! Fresh start, fresh hustle 🌱`,
    ],
    afternoon: [
      `Good afternoon, ${name}! Don't forget to stretch 🧘`,
      `Hey ${name}! Mid-day check — small wins still count.`,
      `Afternoon ${name}! One focused hour can change a week.`,
    ],
    evening: [
      `Good evening, ${name}! Seems like a lot of work today — we're with you 💪`,
      `Evening ${name}! Wrap one more thing, then breathe.`,
      `Hey ${name}, golden hour productivity is real ✨`,
    ],
    night: [
      `Burning the midnight oil, ${name}? Pace yourself 🌙`,
      `It's late, ${name}. Sleep is a feature, not a bug.`,
      `Hey night-owl ${name}, save & resume tomorrow?`,
    ],
  };
  return pickFrom(decks[tod]);
}

const RANDOM_LINES = [
  "Want to know something? You're closer than you think.",
  "Tiny tip: ship at 80%, polish in production.",
  "Pssst — your dashboard has tools you haven't tried.",
  "Your future self will thank you for one extra invoice today.",
  "Don't think too hard — pick the smallest next step.",
  "Clients love speed. AI auto-fill is right there.",
  "Save a draft — momentum beats perfection.",
];

const ROUTE_LINES: { match: RegExp; lines: string[] }[] = [
  { match: /^\/dashboard/, lines: ["Welcome to your cockpit.", "Your daily mission control 🎯"] },
  { match: /^\/tools/, lines: ["Pro tip: signed-in users get full AI fill in the dashboard version.", "These tools save to your browser automatically."] },
  { match: /^\/work/, lines: ["The freelancer OS — clients, time, money, all in one.", "Log one task, build the habit."] },
  { match: /^\/community/, lines: ["Say hi 👋 — the community is more chill than you think."] },
  { match: /^\/explore/, lines: ["Bookmark anything that sparks an idea."] },
  { match: /^\/hustlebot/, lines: ["HustleBot is your 24/7 mentor — ask anything."] },
];

function CatFace() {
  // Pure-CSS animated cat face — blinks + tail wiggles via framer-motion.
  return (
    <motion.div
      animate={{ rotate: [0, -3, 3, -2, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className="relative w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 via-orange-400 to-rose-400 shadow-lg flex items-center justify-center"
    >
      {/* Ears */}
      <span className="absolute -top-2 left-1.5 w-3 h-3 bg-orange-400 rotate-45 rounded-sm shadow" />
      <span className="absolute -top-2 right-1.5 w-3 h-3 bg-orange-400 -rotate-45 rounded-sm shadow" />
      <span className="absolute -top-1 left-2 w-1.5 h-1.5 bg-rose-300 rotate-45 rounded-sm" />
      <span className="absolute -top-1 right-2 w-1.5 h-1.5 bg-rose-300 -rotate-45 rounded-sm" />
      {/* Eyes */}
      <div className="flex gap-1.5 items-center -mt-0.5">
        <motion.span
          animate={{ scaleY: [1, 1, 0.1, 1] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.92, 0.96, 1] }}
          className="block w-1.5 h-2 bg-slate-900 rounded-full"
        />
        <motion.span
          animate={{ scaleY: [1, 1, 0.1, 1] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.92, 0.96, 1] }}
          className="block w-1.5 h-2 bg-slate-900 rounded-full"
        />
      </div>
      {/* Nose + mouth */}
      <span className="absolute bottom-3 w-1 h-1 bg-rose-700 rounded-full" />
      <span className="absolute bottom-1.5 w-2 h-1 border-b-2 border-slate-800 rounded-b-full" />
      {/* Whiskers */}
      <span className="absolute bottom-3 left-0 w-2 h-px bg-slate-700/70" />
      <span className="absolute bottom-3 right-0 w-2 h-px bg-slate-700/70" />
    </motion.div>
  );
}

export default function MascotCompanion() {
  const { user, profile } = useAuth();
  const { pathname } = useLocation();
  const [enabled, setEnabled] = useState<boolean>(isMascotEnabled());
  const [message, setMessage] = useState<string | null>(null);
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const lastRouteRef = useRef<string>("");
  const idleTimerRef = useRef<number | null>(null);

  const name = (profile?.display_name?.split(" ")[0]) || "friend";

  // Sync toggle across tabs / from settings.
  useEffect(() => {
    const onToggle = () => setEnabled(isMascotEnabled());
    window.addEventListener("mascot:toggle", onToggle);
    window.addEventListener("storage", onToggle);
    return () => {
      window.removeEventListener("mascot:toggle", onToggle);
      window.removeEventListener("storage", onToggle);
    };
  }, []);

  const say = (text: string, holdMs = 8000) => {
    setMessage(text);
    setBubbleOpen(true);
    window.setTimeout(() => setBubbleOpen(false), holdMs);
  };

  // Greet once per session-day (hourly bucket so part-of-day changes re-fire).
  useEffect(() => {
    if (!enabled) return;
    const stamp = `${new Date().toDateString()}|${partOfDay()}`;
    const last = (() => { try { return localStorage.getItem(LAST_GREET_KEY); } catch { return null; } })();
    if (last !== stamp) {
      try { localStorage.setItem(LAST_GREET_KEY, stamp); } catch {}
      window.setTimeout(() => say(greetingFor(name)), 1200);
    }
  }, [enabled, name]);

  // Route-change context lines (skip first render).
  useEffect(() => {
    if (!enabled) return;
    if (lastRouteRef.current && lastRouteRef.current !== pathname) {
      const hit = ROUTE_LINES.find((r) => r.match.test(pathname));
      if (hit && Math.random() < 0.55) say(pickFrom(hit.lines), 6000);
    }
    lastRouteRef.current = pathname;
  }, [pathname, enabled]);

  // Idle: nudge after 90s of no activity.
  useEffect(() => {
    if (!enabled) return;
    const reset = () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => say(pickFrom(RANDOM_LINES), 7000), 90_000);
    };
    const evts = ["mousemove", "keydown", "scroll", "touchstart"] as const;
    evts.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      evts.forEach((e) => window.removeEventListener(e, reset));
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[190] flex items-end gap-2 print:hidden select-none">
      <button
        type="button"
        onClick={() => bubbleOpen ? setBubbleOpen(false) : say(pickFrom(RANDOM_LINES))}
        className="relative group"
        aria-label="Companion"
      >
        <CatFace />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
      </button>

      <AnimatePresence>
        {bubbleOpen && message && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            className="relative max-w-[260px] mb-1"
          >
            <div className="rounded-2xl rounded-bl-sm bg-white border border-slate-200 shadow-xl px-3 py-2 pr-8">
              <div className="flex items-start gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[12px] text-slate-800 leading-snug">{message}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setBubbleOpen(false); }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMascotEnabled(false); setEnabled(false); }}
                className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-700 transition"
                title="Hide the companion (re-enable in Profile)"
              >
                <EyeOff className="w-2.5 h-2.5" /> hide me
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}