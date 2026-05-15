import { motion } from "framer-motion";
import { Sparkles, ArrowLeft, KeyRound } from "lucide-react";
import { MARKETING_ORIGIN, isDualHost } from "@/lib/host";

/**
 * Cinematic gate shown when a visitor lands on workspace.* without a valid
 * session. This is intentionally NOT a generic auth error — it is a portal:
 * the workspace is positioned as an exclusive surface only reachable through
 * the main HustleAI portal on hustlaiapp.in.
 */
export default function PortalGate() {
  const back = isDualHost() ? "/workspaces" : `${MARKETING_ORIGIN}/workspaces`;
  return (
    <div className="ws-portal min-h-screen relative overflow-hidden flex items-center justify-center px-6 text-foreground">
      {/* Ambient cosmic field */}
      <div aria-hidden className="absolute inset-0 ws-portal-bg" />
      <div aria-hidden className="absolute inset-0 ws-portal-stars" />
      <div aria-hidden className="absolute inset-0 ws-portal-stars ws-portal-stars--slow" />
      <div aria-hidden className="ws-portal-orb" />
      <div aria-hidden className="ws-portal-orb ws-portal-orb--violet" />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative z-10 max-w-xl text-center"
      >
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md">
          <KeyRound className="h-3 w-3 text-emerald-300/90" />
          <span className="text-[10px] uppercase tracking-[0.22em] text-emerald-200/80">Workspace · portal access</span>
        </div>

        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.9, ease: "easeOut" }}
          className="ws-portal-ring mx-auto mb-8"
        >
          <div className="ws-portal-ring-inner">
            <Sparkles className="h-7 w-7 text-emerald-300" />
          </div>
        </motion.div>

        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
          Oh no dear…<br />seems you arrived without your magic powers ✨
        </h1>
        <p className="mt-5 text-sm sm:text-base text-white/60 leading-relaxed">
          The workspace is your private execution kingdom — sealed behind a
          portal access token. Return to HustleAI and open a workspace portal
          to continue.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={back}
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-white text-black px-6 py-3 text-sm font-medium shadow-[0_0_40px_rgba(16,185,129,0.25)] hover:scale-[1.02] transition-transform"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Return to HustleAI
          </a>
          <span className="text-[11px] text-white/40">No login. No reset. Just the portal.</span>
        </div>
      </motion.div>

      <p className="absolute bottom-6 left-0 right-0 text-center text-[11px] text-white/30 z-10">
        workspace.hustlaiapp.in · isolated execution surface
      </p>
    </div>
  );
}