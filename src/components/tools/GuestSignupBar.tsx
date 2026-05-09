import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Sticky bottom signup bar shown only to guests on free tool pages.
 * Dismissible per session. Stripe-minimal: thin, dark, restrained.
 */
export function GuestSignupBar({ toolName }: { toolName: string }) {
  const { user, loading } = useAuth();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem("hai_signup_bar_dismissed") === "1");
  }, []);

  if (loading || user || dismissed || pathname.startsWith("/dashboard")) return null;

  const next = encodeURIComponent(pathname + search);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-4 sm:pb-4 print:hidden pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        <div className="rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-800 flex items-center gap-3 pl-4 pr-2 py-2.5">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0 text-xs sm:text-sm">
            <span className="font-semibold">Free forever.</span>{" "}
            <span className="text-slate-300">Sign up to download {toolName}, save drafts & sync to your workspace.</span>
          </div>
          <button
            onClick={() => navigate(`/signup?next=${next}`)}
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold bg-white text-slate-900 hover:bg-emerald-50 rounded-lg px-3 py-1.5 transition"
          >
            Sign up free <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => navigate(`/signup?next=${next}`)}
            className="sm:hidden text-xs font-semibold bg-white text-slate-900 rounded-lg px-3 py-1.5"
          >
            Sign up
          </button>
          <button
            onClick={() => { sessionStorage.setItem("hai_signup_bar_dismissed", "1"); setDismissed(true); }}
            className="w-7 h-7 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}