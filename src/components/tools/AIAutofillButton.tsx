import { Sparkles, Wand2, Lock, ArrowRight, PenLine } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Small "AI Autofill" trigger. On click it should call the parent's `guard()`
 * with an action like "auto-fill this with AI". For guests this opens the
 * signup gate; for signed-in users we eventually wire it to the AI gateway.
 */
export function AIAutofillIcon({
  onClick,
  label = "Auto-fill with AI",
  className,
  sectionName,
  dashboardPath,
  storageKey,
}: {
  onClick?: () => void;
  label?: string;
  className?: string;
  sectionName?: string;
  /** Path to the in-dashboard AI version of this tool. If set, signed-in clicks redirect there. */
  dashboardPath?: string;
  /** localStorage key holding current public-tool draft so dashboard can hydrate it. */
  storageKey?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [open, setOpen] = useState(false);
  const next = encodeURIComponent(pathname + search);

  const goToDashboardAI = () => {
    if (dashboardPath) {
      // Hand the current draft to the dashboard tool so AI fill is in-context.
      try {
        const draft = storageKey ? localStorage.getItem(storageKey) : null;
        if (draft) sessionStorage.setItem("hustleai-ai-prefill", draft);
        sessionStorage.setItem("hustleai-ai-section", sectionName || "all");
      } catch {}
      toast.success("Opening AI version in your dashboard", {
        description: "Free plan: 3 AI fills/day · Pro: 5 · Elite: 10 · Infinity: 20",
      });
      navigate(`${dashboardPath}?ai=${encodeURIComponent(sectionName || "all")}`);
    } else {
      toast.info("AI auto-fill is rolling out for this tool soon", {
        description: "Try the AI Invoice or Proposal Generator inside your dashboard.",
      });
      onClick?.();
    }
  };

  // Signed in: redirect to dashboard AI tool (with quota) or fall back to inline.
  if (user) {
    return (
      <button
        type="button"
        onClick={goToDashboardAI}
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
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
            onClick={() => setOpen(false)}
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
  dashboardPath,
  storageKey,
  sectionName,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
  dashboardPath?: string;
  storageKey?: string;
  sectionName?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    if (user && dashboardPath) {
      try {
        const draft = storageKey ? localStorage.getItem(storageKey) : null;
        if (draft) sessionStorage.setItem("hustleai-ai-prefill", draft);
        sessionStorage.setItem("hustleai-ai-section", sectionName || "all");
      } catch {}
      toast.success("Opening AI version in your dashboard", {
        description: "Free plan: 3 AI fills/day · Pro: 5 · Elite: 10 · Infinity: 20",
      });
      navigate(`${dashboardPath}?ai=all`);
      return;
    }
    if (user && !dashboardPath) {
      toast.info("AI auto-fill is rolling out for this tool soon", {
        description: "Try the AI Invoice or Proposal Generator inside your dashboard.",
      });
    }
    onClick();
  };

  return (
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
  );
}