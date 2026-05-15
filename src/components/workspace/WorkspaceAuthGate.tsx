import { ReactNode, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import PortalGate from "./PortalGate";

/**
 * Workspace-only auth gate. Unlike RequireAuth (which redirects to /login),
 * this surfaces a cinematic PortalGate when there is no session — workspace
 * is positioned as exclusive, accessed only via the main HustleAI portal.
 *
 * Also detects the cross-host handoff (Supabase tokens consumed from the URL
 * hash on first paint) and shows a brief "Welcome back" overlay so the
 * arrival feels like a transition, not a redirect.
 */
export function WorkspaceAuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const arrivedFromHandoff = useRef<boolean>(
    typeof window !== "undefined" && /access_token=/.test(window.location.hash || "")
  );
  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeShown = useRef(false);

  useEffect(() => {
    if (welcomeShown.current) return;
    if (!loading && user && arrivedFromHandoff.current) {
      welcomeShown.current = true;
      setShowWelcome(true);
      const t = window.setTimeout(() => setShowWelcome(false), 1700);
      return () => window.clearTimeout(t);
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="ws-portal min-h-screen flex items-center justify-center text-foreground">
        <div aria-hidden className="absolute inset-0 ws-portal-bg" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="ws-portal-ring scale-75">
            <div className="ws-portal-ring-inner">
              <Sparkles className="h-5 w-5 text-emerald-300 animate-pulse" />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/70">Opening portal…</p>
        </div>
      </div>
    );
  }

  if (!user) return <PortalGate />;

  return (
    <>
      {children}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center"
          >
            <div aria-hidden className="absolute inset-0 bg-[hsl(222_30%_4%)]/80 backdrop-blur-md" />
            <motion.div
              initial={{ y: 12, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
              className="relative z-10 text-center px-6"
            >
              <div className="ws-portal-ring scale-75 mx-auto mb-4">
                <div className="ws-portal-ring-inner">
                  <Sparkles className="h-5 w-5 text-emerald-300" />
                </div>
              </div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-200/80 mb-2">Portal open</p>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
                Welcome back.
              </h2>
              <p className="text-sm text-white/60 mt-1">Your throne awaits.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}