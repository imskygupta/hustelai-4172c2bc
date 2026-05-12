// StartHerePanel — first-action guidance for newly-activated users.
// Auto-hides once the user has 3+ checklist completions OR explicitly dismisses.
// Designed to feel like a calm, infrastructure-grade workspace prompt — not a tour.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, FileText, Receipt, ClipboardList, Sparkles, X, CheckCircle2, Circle, Loader2,
} from "lucide-react";

type FirstRunState = {
  ran_tool?: boolean;
  exported?: boolean;
  workspace_created?: boolean;
  telegram_connected?: boolean;
  dismissed?: boolean;
  completed_paths?: string[];
};

const PATHS = [
  {
    id: "proposal",
    title: "Send your first proposal",
    icon: FileText,
    eta: "≈ 2 min",
    outcome: "A branded PDF, ready to send.",
    after: "We'll suggest converting it to an invoice next.",
    href: "/tools/proposal-generator?onboarding=1",
  },
  {
    id: "intake",
    title: "Onboard your first client",
    icon: ClipboardList,
    eta: "≈ 3 min",
    outcome: "A live intake link your client can fill in.",
    after: "Submissions land in your workspace inbox.",
    href: "/workspace-os/intake-forms?onboarding=1",
  },
  {
    id: "invoice",
    title: "Generate your first invoice",
    icon: Receipt,
    eta: "≈ 90 sec",
    outcome: "A polished invoice + payment link.",
    after: "Optional: deliver it to Telegram automatically.",
    href: "/tools/invoice-generator?onboarding=1",
  },
] as const;

const CHECKLIST = [
  { key: "workspace_created", label: "Create a workspace" },
  { key: "ran_tool", label: "Run your first tool" },
  { key: "exported", label: "Export one file" },
  { key: "telegram_connected", label: "Connect Telegram (optional)" },
] as const;

function readLocal(): FirstRunState {
  try { return JSON.parse(localStorage.getItem("hai:first_run") || "{}"); } catch { return {}; }
}
function writeLocal(s: FirstRunState) {
  try { localStorage.setItem("hai:first_run", JSON.stringify(s)); } catch {}
}

export default function StartHerePanel() {
  const { user } = useAuth();
  const [state, setState] = useState<FirstRunState>(() => readLocal());
  const [loading, setLoading] = useState(true);

  // Hydrate from server profile on mount; merge with local cache.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("first_run_state")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const remote = ((data as any)?.first_run_state ?? {}) as FirstRunState;
      const merged: FirstRunState = { ...readLocal(), ...remote };
      setState(merged);
      writeLocal(merged);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Best-effort signal harvest: infer ran_tool/exported/workspace from existing tables.
  useEffect(() => {
    if (!user || loading) return;
    let cancelled = false;
    (async () => {
      const next: FirstRunState = { ...state };
      let changed = false;

      if (!next.ran_tool) {
        const { count } = await supabase
          .from("ai_daily_usage").select("*", { count: "exact", head: true })
          .eq("user_id", user.id);
        if ((count || 0) > 0) { next.ran_tool = true; changed = true; }
      }
      if (!next.exported) {
        const { count } = await supabase
          .from("workspace_doc_exports").select("*", { count: "exact", head: true })
          .eq("user_id", user.id);
        if ((count || 0) > 0) { next.exported = true; changed = true; }
      }
      if (!next.telegram_connected) {
        const { count } = await supabase
          .from("notification_integrations").select("*", { count: "exact", head: true })
          .eq("user_id", user.id).eq("provider", "telegram").eq("status", "connected");
        if ((count || 0) > 0) { next.telegram_connected = true; changed = true; }
      }

      if (changed && !cancelled) {
        setState(next);
        writeLocal(next);
        await supabase.from("profiles")
          .update({ first_run_state: next as any })
          .eq("user_id", user.id);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const completedCount = useMemo(
    () => CHECKLIST.filter(c => (state as any)[c.key]).length,
    [state],
  );

  async function dismiss() {
    const next = { ...state, dismissed: true };
    setState(next);
    writeLocal(next);
    if (user) {
      await supabase.from("profiles")
        .update({ first_run_state: next as any })
        .eq("user_id", user.id);
    }
  }

  if (loading) return null;
  if (state.dismissed) return null;
  // Auto-hide once 3 of 4 checklist items are done.
  if (completedCount >= 3) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-5 md:p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-slate-900 text-white grid place-items-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-slate-900 text-[15px] leading-tight">
              Start here
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pick one path. Most people see their first export inside 3 minutes.
            </p>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss start here"
          className="text-slate-400 hover:text-slate-700 transition-colors p-1 -mr-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Path cards */}
      <div className="mt-4 grid md:grid-cols-3 gap-3">
        {PATHS.map((p) => {
          const Icon = p.icon;
          return (
            <Link
              key={p.id}
              to={p.href}
              className="group relative rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-900 hover:shadow-md transition-all flex flex-col"
            >
              {/* Operational ribbon */}
              <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
              <div className="flex items-start justify-between mb-3">
                <div className="h-8 w-8 rounded-md bg-slate-50 border border-slate-200 grid place-items-center group-hover:bg-slate-900 group-hover:border-slate-900 transition-colors">
                  <Icon className="h-4 w-4 text-slate-700 group-hover:text-white transition-colors" />
                </div>
                <Badge variant="outline" className="text-[10px] font-mono text-slate-500 border-slate-200">
                  {p.eta}
                </Badge>
              </div>
              <h3 className="font-medium text-slate-900 text-sm">{p.title}</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{p.outcome}</p>
              <div className="mt-3 pt-3 border-t border-dashed border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 italic">{p.after}</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Inline checklist */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Setup checklist
          </p>
          <p className="text-[11px] font-mono text-slate-500 tabular-nums">
            {completedCount}/{CHECKLIST.length}
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {CHECKLIST.map((c) => {
            const done = !!(state as any)[c.key];
            return (
              <div
                key={c.key}
                className={`flex items-center gap-1.5 text-[11px] px-2 py-1.5 rounded-md border ${
                  done
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                {done
                  ? <CheckCircle2 className="h-3 w-3 shrink-0" />
                  : <Circle className="h-3 w-3 shrink-0 text-slate-400" />}
                <span className="truncate">{c.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Subtle inline loader variant if a parent ever needs it.
export function StartHereInlineSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-2 text-xs text-slate-500">
      <Loader2 className="h-3 w-3 animate-spin" /> Preparing your first-run guide…
    </div>
  );
}