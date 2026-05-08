import { Sparkles, Wand2, Lock, ArrowRight, PenLine, X, Crown, Check, KeyRound, Infinity as InfinityIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getMaxUses, getUsage, type Tier } from "@/lib/tool-limits";
import { consumeDailyAI } from "@/lib/ai-usage";
import { CreditsExhaustedDialog } from "@/components/tools/CreditsExhaustedDialog";
import { toast } from "sonner";

const PAID_TIERS = new Set(["pro", "elite", "infinity"]);

/** Stable per-tool storage key derived from the current pathname. */
function toolKeyFromPath(pathname: string) {
  if (pathname.includes("invoice")) return "tool_invoice_dashboard";
  if (pathname.includes("proposal")) return "tool_proposal_dashboard";
  if (pathname.includes("contract") || pathname.includes("agreement")) return "tool_contract_dashboard";
  return "tool_generic_dashboard";
}

function toolNameFromPath(pathname: string) {
  if (pathname.includes("invoice")) return "Invoice Generator";
  if (pathname.includes("proposal")) return "Proposal Generator";
  if (pathname.includes("contract") || pathname.includes("agreement")) return "Contract Generator";
  return "Doc Tool";
}

/** Map a public /tools/* page to its richer in-dashboard equivalent. */
function dashboardEquivalent(pathname: string): { href: string; label: string } {
  if (pathname.includes("invoice")) return { href: "/dashboard/tools/invoice-generator", label: "Invoice Generator" };
  if (pathname.includes("proposal")) return { href: "/dashboard/tools/proposal-generator", label: "Proposal Generator" };
  if (pathname.includes("contract") || pathname.includes("agreement"))
    return { href: "/dashboard/tools/contract-generator", label: "Contract Generator" };
  return { href: "/dashboard/tools", label: "Doc Tools" };
}

/**
 * BYOK upsell shown to FREE users on /dashboard/tools/* when they tap AI fill.
 * - "Use my free quota" → runs the fill (consumes one of 3/mo)
 * - "Connect my key"   → /workspaces/ai-settings (unlimited at provider cost)
 */
function ByokDialog({
  open,
  onClose,
  onUseFree,
  used,
  max,
  toolName,
  outOfQuota,
}: {
  open: boolean;
  onClose: () => void;
  onUseFree: () => void;
  used: number;
  max: number;
  toolName: string;
  outOfQuota: boolean;
}) {
  const navigate = useNavigate();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-white border border-violet-200/60 shadow-2xl overflow-hidden"
          >
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-violet-200/40 blur-3xl pointer-events-none" />
            <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
              <X className="w-4 h-4" />
            </button>
            <div className="relative p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
                  <KeyRound className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-violet-700">{toolName} · AI fill</div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    {outOfQuota ? "You're out of free AI fills" : "Why not use your own keys?"}
                  </h3>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {outOfQuota ? (
                  <>You used <b>{used}/{max}</b> free AI fills this month on the free plan. Plug in your own AI key for <b>unlimited</b> generations at provider cost.</>
                ) : (
                  <>You're on the free plan — <b>{used}/{max}</b> AI fills used this month. Plug in your own AI key once and get <b>unlimited</b> summaries forever.</>
                )}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase">Free plan</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{max}/mo</div>
                  <div className="text-[11px] text-slate-500">platform AI</div>
                </div>
                <div className="rounded-lg border border-violet-300 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-violet-700 uppercase"><InfinityIcon className="w-3 h-3" /> BYOK</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">Unlimited</div>
                  <div className="text-[11px] text-violet-700">your provider key</div>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => { onClose(); navigate("/workspaces/ai-settings"); }}
                  className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition group"
                >
                  <KeyRound className="w-4 h-4" />
                  Connect my AI key
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
                {!outOfQuota && (
                  <button
                    onClick={() => { onClose(); onUseFree(); }}
                    className="w-full h-10 inline-flex items-center justify-center gap-1.5 rounded-md border border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-medium transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Use my free fill ({max - used} left)
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-900 transition pt-1"
                >
                  <PenLine className="w-3 h-3" /> No thanks, I'll fill manually
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function UseInDashboardDialog({
  open,
  onClose,
  sectionName,
}: {
  open: boolean;
  onClose: () => void;
  sectionName?: string;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dest = dashboardEquivalent(pathname);

  const perks = [
    "Full AI auto-fill — scope, line items & terms",
    "Save unlimited drafts tied to clients",
    "Reuse business profile, logo & branding",
    "Send, track opens & convert to invoices",
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl bg-white border border-emerald-200/60 shadow-2xl overflow-hidden"
          >
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-200/40 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-teal-200/30 blur-3xl pointer-events-none" />
            <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
              <X className="w-4 h-4" />
            </button>
            <div className="relative p-7 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-700">You're signed in ✨</div>
                  <h3 className="text-xl font-bold text-slate-900 leading-tight">Use this tool inside your dashboard</h3>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                This public generator is a quick one-off. Inside your HustleAI dashboard, the{" "}
                <span className="font-semibold text-slate-900">{dest.label}</span> gives you the full experience —
                {sectionName ? ` AI-fill the ${sectionName},` : " AI-fill every section,"} save drafts, reuse client &
                branding profiles and track everything in one place.
              </p>
              <ul className="grid sm:grid-cols-2 gap-2 bg-slate-50 rounded-xl p-4 border border-slate-200/70">
                {perks.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-xs text-slate-700">
                    <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => { onClose(); navigate(dest.href); }}
                  className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold transition group"
                >
                  <Crown className="w-4 h-4" />
                  Open {dest.label}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 sm:flex-none h-11 inline-flex items-center justify-center gap-1.5 px-4 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-sm font-medium transition"
                >
                  <PenLine className="w-3.5 h-3.5" /> Stay & fill manually
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AIAutofillIcon({
  onClick,
  label = "Auto-fill with AI",
  className,
  sectionName,
}: {
  onClick?: () => void;
  label?: string;
  className?: string;
  sectionName?: string;
  /** @deprecated kept for backward compat with existing call sites */
  dashboardPath?: string;
  /** @deprecated kept for backward compat with existing call sites */
  storageKey?: string;
}) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [popOpen, setPopOpen] = useState(false);
  const [dashOpen, setDashOpen] = useState(false);
  const [byokOpen, setByokOpen] = useState(false);
  const [exhaustedOpen, setExhaustedOpen] = useState(false);
  const next = encodeURIComponent(pathname + search);
  const inDashboardTool = pathname.startsWith("/dashboard/tools");
  const tier = (profile?.subscription_tier as Tier) || "free";
  const max = getMaxUses(tier);
  const toolKey = toolKeyFromPath(pathname);
  const used = getUsage(toolKey, user?.id);

  const featureKey = toolKey.includes("invoice") ? "invoice" : toolKey.includes("proposal") ? "proposal" : toolKey.includes("contract") ? "contract" : "doc_autofill";

  const runWithQuota = async () => {
    const r = await consumeDailyAI(featureKey);
    if (!r.allowed) { setExhaustedOpen(true); return; }
    onClick?.();
  };

  const handleDashboardClick = () => {
    if (PAID_TIERS.has(tier)) {
      runWithQuota();
      return;
    }
    setByokOpen(true);
  };

  if (user && inDashboardTool) {
    return (
      <>
        <button
          type="button"
          onClick={handleDashboardClick}
          title={label}
          className={cn(
            "group inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md",
            "text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200/70 transition print:hidden",
            className,
          )}
        >
          <Sparkles className="w-3 h-3 group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline">AI fill</span>
        </button>
        <ByokDialog
          open={byokOpen}
          onClose={() => setByokOpen(false)}
          onUseFree={runWithQuota}
          used={used}
          max={max}
          toolName={toolNameFromPath(pathname)}
          outOfQuota={used >= max}
        />
        <CreditsExhaustedDialog
          open={exhaustedOpen}
          onClose={() => setExhaustedOpen(false)}
          toolName={toolNameFromPath(pathname)}
        />
      </>
    );
  }

  if (user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setDashOpen(true)}
          title={label}
          className={cn(
            "group inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md",
            "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 transition print:hidden",
            className,
          )}
        >
          <Sparkles className="w-3 h-3 group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline">AI fill</span>
        </button>
        <UseInDashboardDialog open={dashOpen} onClose={() => setDashOpen(false)} sectionName={sectionName} />
      </>
    );
  }

  return (
    <Popover open={popOpen} onOpenChange={setPopOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={label}
          className={cn(
            "group inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md",
            "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 transition print:hidden",
            className,
          )}
        >
          <Sparkles className="w-3 h-3 group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline">AI fill</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-72 p-0 border-emerald-200/70 shadow-xl rounded-xl overflow-hidden"
      >
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 px-4 py-3 border-b border-emerald-100 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow">
            <Lock className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">AI auto-fill</div>
            <div className="text-[13px] font-bold text-slate-900 leading-tight">
              Sign in to let AI fill {sectionName ? `the ${sectionName}` : "this"}
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            One click and AI drafts {sectionName || "this section"} from a short prompt. Free with any HustleAI account.
          </p>
          <button
            onClick={() => navigate(`/signup?next=${next}`)}
            className="w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition group"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Sign up free & auto-fill
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button
            onClick={() => setPopOpen(false)}
            className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-900 transition"
          >
            <PenLine className="w-3 h-3" /> No thanks, I'll fill it myself
          </button>
          <p className="text-[10px] text-center text-slate-400">
            Already a member?{" "}
            <button onClick={() => navigate(`/login?next=${next}`)} className="text-emerald-700 font-semibold hover:underline">
              Sign in
            </button>
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AIAutofillButton({
  onClick,
  label = "Auto-fill with AI",
  className,
  sectionName,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
  sectionName?: string;
  /** @deprecated kept for backward compat with existing call sites */
  dashboardPath?: string;
  /** @deprecated kept for backward compat with existing call sites */
  storageKey?: string;
}) {
  const { user, profile } = useAuth();
  const { pathname } = useLocation();
  const [dashOpen, setDashOpen] = useState(false);
  const [byokOpen, setByokOpen] = useState(false);
  const [exhaustedOpen, setExhaustedOpen] = useState(false);
  const inDashboardTool = pathname.startsWith("/dashboard/tools");
  const tier = (profile?.subscription_tier as Tier) || "free";
  const max = getMaxUses(tier);
  const toolKey = toolKeyFromPath(pathname);
  const used = getUsage(toolKey, user?.id);

  const featureKey = toolKey.includes("invoice") ? "invoice" : toolKey.includes("proposal") ? "proposal" : toolKey.includes("contract") ? "contract" : "doc_autofill";

  const runWithQuota = async () => {
    const r = await consumeDailyAI(featureKey);
    if (!r.allowed) { setExhaustedOpen(true); return; }
    onClick();
  };

  const handleClick = () => {
    if (user && inDashboardTool) {
      if (PAID_TIERS.has(tier)) { runWithQuota(); return; }
      setByokOpen(true);
      return;
    }
    if (user) {
      setDashOpen(true);
      return;
    }
    onClick();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-2 px-3 h-9 rounded-md text-sm font-semibold",
          "text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500",
          "shadow-sm shadow-emerald-600/20 transition print:hidden",
          className,
        )}
      >
        <Wand2 className="w-4 h-4" />
        {label}
      </button>
      <UseInDashboardDialog open={dashOpen} onClose={() => setDashOpen(false)} sectionName={sectionName} />
      <ByokDialog
        open={byokOpen}
        onClose={() => setByokOpen(false)}
        onUseFree={runWithQuota}
        used={used}
        max={max}
        toolName={toolNameFromPath(pathname)}
        outOfQuota={used >= max}
      />
      <CreditsExhaustedDialog
        open={exhaustedOpen}
        onClose={() => setExhaustedOpen(false)}
        toolName={toolNameFromPath(pathname)}
      />
    </>
  );
}
