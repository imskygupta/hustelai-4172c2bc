import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { X, EyeOff, Sparkles, Lock, MessageCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Animated pet companion — sits where the old HustleBot launcher used to be
 * (bottom-right by default), is fully draggable around the screen, and runs
 * a small pure-algo personality engine: greetings, route-aware tips,
 * idle nudges, an "opposite-direction drift" after 1–2h active session,
 * and a sleep/wake cycle when the user hides it.
 *
 * Tiered:
 *   - Free   → mascot is locked to the cat and says "pls free me" if clicked
 *   - Pro+   → can pick from 4 mascots (Profile → Notifications)
 */
const ENABLED_KEY = "hustleai_mascot_enabled_v1";
const LAST_GREET_KEY = "hustleai_mascot_last_greet_v1";
const POS_KEY = "hustleai_mascot_pos_v1";
const PET_KEY = "hustleai_mascot_pet_v1";
const SLEEP_KEY = "hustleai_mascot_sleeping_v1";
const SESSION_START_KEY = "hustleai_mascot_session_start_v1";

export type PetKey = "cat" | "dog" | "fox" | "bunny";

export const PETS: Record<PetKey, { label: string; emoji: string; bg: string; ring: string }> = {
  cat:   { label: "Cat",   emoji: "🐱", bg: "from-amber-300 via-orange-400 to-rose-400",   ring: "ring-orange-300" },
  dog:   { label: "Dog",   emoji: "🐶", bg: "from-amber-200 via-yellow-400 to-orange-400", ring: "ring-yellow-300" },
  fox:   { label: "Fox",   emoji: "🦊", bg: "from-orange-300 via-red-400 to-rose-500",     ring: "ring-red-300" },
  bunny: { label: "Bunny", emoji: "🐰", bg: "from-pink-200 via-rose-300 to-fuchsia-400",   ring: "ring-pink-300" },
};

export function isMascotEnabled() {
  try { return localStorage.getItem(ENABLED_KEY) !== "0"; } catch { return true; }
}
export function setMascotEnabled(v: boolean) {
  try {
    localStorage.setItem(ENABLED_KEY, v ? "1" : "0");
    if (v) localStorage.removeItem(SLEEP_KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent("mascot:toggle", { detail: v }));
}
export function getMascotPet(): PetKey {
  try {
    const v = localStorage.getItem(PET_KEY) as PetKey | null;
    if (v && PETS[v]) return v;
  } catch {}
  return "cat";
}
export function setMascotPet(p: PetKey) {
  try { localStorage.setItem(PET_KEY, p); } catch {}
  window.dispatchEvent(new CustomEvent("mascot:pet", { detail: p }));
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

function greetingFor(name: string, returning: boolean) {
  if (returning) {
    return pickFrom([
      `Missed me, ${name}? 🥹 I was just napping.`,
      `Back already, ${name}? Floating in… ✨`,
      `Yo ${name}! Your pet PA reporting for duty.`,
    ]);
  }
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

const LONG_SESSION_LINES = [
  "What are you doing, mate? Seems busy huh!! 👀",
  "Bro… 1-hour straight? Hydrate. Stretch. Then continue 💧",
  "Still grinding? Respect. Take a 2-min walk anyway.",
  "Marathon mode detected 🏃 — small breaks, big output.",
];

const ROUTE_LINES: { match: RegExp; lines: string[] }[] = [
  { match: /^\/dashboard/, lines: ["Welcome to your cockpit.", "Your daily mission control 🎯"] },
  { match: /^\/tools/, lines: ["Pro tip: signed-in users get full AI fill in the dashboard version.", "These tools save to your browser automatically."] },
  { match: /^\/work/, lines: ["The freelancer OS — clients, time, money, all in one.", "Log one task, build the habit."] },
  { match: /^\/community/, lines: ["Say hi 👋 — the community is more chill than you think."] },
  { match: /^\/explore/, lines: ["Bookmark anything that sparks an idea."] },
  { match: /^\/hustlebot/, lines: ["HustleBot is your 24/7 mentor — ask anything."] },
];

function PetFace({ pet, sleeping }: { pet: PetKey; sleeping?: boolean }) {
  const meta = PETS[pet];
  return (
    <motion.div
      animate={sleeping ? { rotate: 0 } : { rotate: [0, -4, 4, -2, 0], y: [0, -2, 0, -1, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className={`relative w-14 h-14 rounded-full bg-gradient-to-br ${meta.bg} shadow-[0_8px_24px_-6px_rgba(244,114,182,0.55)] flex items-center justify-center ring-2 ${meta.ring} ring-offset-2 ring-offset-white/0`}
    >
      <span className="text-2xl leading-none drop-shadow-sm select-none" aria-hidden>
        {sleeping ? "💤" : meta.emoji}
      </span>
      {/* Bouncing ball — adds the "playful pet" vibe */}
      {!sleeping && (
        <motion.span
          aria-hidden
          animate={{ y: [0, -6, 0], x: [0, 2, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-rose-400 to-amber-300 border border-white shadow"
        />
      )}
      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
    </motion.div>
  );
}

export default function MascotCompanion() {
  const { user, profile } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState<boolean>(isMascotEnabled());
  const [pet, setPet] = useState<PetKey>(getMascotPet());
  const [message, setMessage] = useState<string | null>(null);
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const lastRouteRef = useRef<string>("");
  const idleTimerRef = useRef<number | null>(null);
  const longSessionTimerRef = useRef<number | null>(null);

  const tier = ((profile?.subscription_tier as string) || "free").toLowerCase();
  const isFree = tier === "free";
  const name = (profile?.display_name?.split(" ")[0]) || "friend";

  // Force the cat for free users; pro+ keeps their selection.
  const effectivePet: PetKey = isFree ? "cat" : pet;

  // Default position: bottom-right (where the old launcher was), with a margin.
  const initialPos = useMemo(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) { const p = JSON.parse(raw); if (typeof p.x === "number") return p; }
    } catch {}
    if (typeof window !== "undefined") {
      return { x: window.innerWidth - 96, y: window.innerHeight - 110 };
    }
    return { x: 0, y: 0 };
  }, []);
  const x = useMotionValue(initialPos.x);
  const y = useMotionValue(initialPos.y);

  // Sync settings/pet across tabs
  useEffect(() => {
    const onToggle = () => setEnabled(isMascotEnabled());
    const onPet = () => setPet(getMascotPet());
    window.addEventListener("mascot:toggle", onToggle);
    window.addEventListener("mascot:pet", onPet);
    window.addEventListener("storage", onToggle);
    return () => {
      window.removeEventListener("mascot:toggle", onToggle);
      window.removeEventListener("mascot:pet", onPet);
      window.removeEventListener("storage", onToggle);
    };
  }, []);

  const say = (text: string, holdMs = 7000) => {
    setMessage(text);
    setBubbleOpen(true);
    window.setTimeout(() => setBubbleOpen(false), holdMs);
  };

  // Greet once per part-of-day. If they were sleeping last session → "missed me".
  useEffect(() => {
    if (!enabled) return;
    const stamp = `${new Date().toDateString()}|${partOfDay()}`;
    let last: string | null = null;
    let wasSleeping = false;
    try {
      last = localStorage.getItem(LAST_GREET_KEY);
      wasSleeping = localStorage.getItem(SLEEP_KEY) === "1";
    } catch {}
    if (last !== stamp || wasSleeping) {
      try { localStorage.setItem(LAST_GREET_KEY, stamp); localStorage.removeItem(SLEEP_KEY); } catch {}
      window.setTimeout(() => say(greetingFor(name, wasSleeping), 8000), 1200);
    }
    // Mark a fresh session start (used by long-session drift trigger).
    try { sessionStorage.setItem(SESSION_START_KEY, String(Date.now())); } catch {}
  }, [enabled, name]);

  // Route-change context lines (skip first render).
  useEffect(() => {
    if (!enabled || sleeping) return;
    if (lastRouteRef.current && lastRouteRef.current !== pathname) {
      const hit = ROUTE_LINES.find((r) => r.match.test(pathname));
      if (hit && Math.random() < 0.55) say(pickFrom(hit.lines), 6000);
    }
    lastRouteRef.current = pathname;
  }, [pathname, enabled, sleeping]);

  // Idle: nudge after 90s of no activity.
  useEffect(() => {
    if (!enabled || sleeping) return;
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
  }, [enabled, sleeping]);

  // Long-session drift: after ~75min of active session, float to opposite
  // corner and complain. Repeats every ~60min while still active.
  useEffect(() => {
    if (!enabled || sleeping) return;
    const schedule = () => {
      let start = 0;
      try { start = Number(sessionStorage.getItem(SESSION_START_KEY) || Date.now()); } catch {}
      const elapsed = Date.now() - start;
      const wait = Math.max(60_000, 75 * 60_000 - elapsed); // first fire ≥75min in
      longSessionTimerRef.current = window.setTimeout(() => {
        // Drift to roughly the opposite quadrant of the viewport.
        const w = window.innerWidth; const h = window.innerHeight;
        const cx = x.get(); const cy = y.get();
        const targetX = cx < w / 2 ? Math.min(w - 96, w - 96) : 16;
        const targetY = cy < h / 2 ? Math.min(h - 110, h - 110) : 16;
        animate(x, targetX, { type: "spring", stiffness: 60, damping: 14 });
        animate(y, targetY, { type: "spring", stiffness: 60, damping: 14 });
        say(pickFrom(LONG_SESSION_LINES), 9000);
        try { localStorage.setItem(POS_KEY, JSON.stringify({ x: targetX, y: targetY })); } catch {}
        // re-arm
        longSessionTimerRef.current = window.setTimeout(schedule, 60 * 60_000);
      }, wait) as unknown as number;
    };
    // Note: 60_000 above is intentional? No — fix typo.
    schedule();
    return () => { if (longSessionTimerRef.current) window.clearTimeout(longSessionTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sleeping]);

  const handleHide = () => {
    // Sleep cycle: say goodbye, fade out, mark sleeping for next session.
    say("Okay byee, going to sleep 💤 see you next login…", 4000);
    try { localStorage.setItem(SLEEP_KEY, "1"); } catch {}
    setSleeping(true);
    window.setTimeout(() => {
      setMascotEnabled(false);
      setEnabled(false);
      setSleeping(false);
    }, 3500);
  };

  const handleClick = () => {
    if (bubbleOpen) { setBubbleOpen(false); return; }
    if (isFree) {
      say("Pls free me 🙏 — upgrade to Pro to unlock pet companions and pick your own!", 7000);
      return;
    }
    say(pickFrom(RANDOM_LINES));
  };

  if (!enabled) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.15}
      style={{ x, y }}
      onDragEnd={() => {
        try { localStorage.setItem(POS_KEY, JSON.stringify({ x: x.get(), y: y.get() })); } catch {}
      }}
      animate={sleeping ? { opacity: 0, scale: 0.7 } : { opacity: 1, scale: 1 }}
      transition={{ duration: sleeping ? 3 : 0.4 }}
      className="fixed top-0 left-0 z-[190] flex items-end gap-2 print:hidden select-none cursor-grab active:cursor-grabbing touch-none"
    >
      <button
        type="button"
        onClick={handleClick}
        className="relative group"
        aria-label="Companion"
      >
        <PetFace pet={effectivePet} sleeping={sleeping} />
        {isFree && (
          <span className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow">
            <Lock className="w-2.5 h-2.5 text-slate-500" />
          </span>
        )}
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
              <div className="mt-1.5 flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); setBubbleOpen(false); navigate("/hustlebot"); }}
                  className="inline-flex items-center gap-1 text-[10px] text-fuchsia-600 hover:text-fuchsia-700 transition font-medium"
                  title="Open HustleBot"
                >
                  <MessageCircle className="w-2.5 h-2.5" /> open HustleBot
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleHide(); }}
                  className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-700 transition"
                  title="Hide the companion (re-enable in Profile)"
                >
                  <EyeOff className="w-2.5 h-2.5" /> hide me
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
