import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Wand2, KeyRound, Crown, ChevronDown, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { consumeDailyAI } from "@/lib/ai-usage";
import { emitAIFill } from "@/lib/ai-fill-bus";
import { CreditsExhaustedDialog } from "@/components/tools/CreditsExhaustedDialog";
import { cn } from "@/lib/utils";

const PAID_TIERS = new Set(["pro", "elite", "infinity"]);
const TEMPLATE_TIERS = new Set(["elite", "infinity"]);

type ToolKind = "invoice" | "proposal" | "contract";
const TASK_BY_KIND: Record<ToolKind, string> = {
  invoice: "tool_invoice_full",
  proposal: "tool_proposal_full",
  contract: "tool_contract_full",
};
const LABEL: Record<ToolKind, string> = {
  invoice: "Invoice",
  proposal: "Proposal",
  contract: "Contract",
};

export interface TemplateOption { id: string; label: string; }

interface Props<S> {
  kind: ToolKind;
  state: S;
  onPatch: (patch: Partial<S>) => void;
  templates?: TemplateOption[];
  currentTemplateId?: string;
  onTemplateChange?: (id: string) => void;
  /** Free users still get `consumeDailyAI("invoice"|...)`; pass the feature key (default = kind). */
  featureKey?: string;
}

export function DashboardToolAIPanel<S extends object,>({
  kind, state, onPatch, templates, currentTemplateId, onTemplateChange, featureKey,
}: Props<S>) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const tier = (profile?.subscription_tier as string) || "free";
  const isPaid = PAID_TIERS.has(tier);
  const canTemplate = TEMPLATE_TIERS.has(tier) && templates && templates.length > 0;

  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState<null | "generate" | "polish">(null);
  const [exhaustedOpen, setExhaustedOpen] = useState(false);
  const [tmplOpen, setTmplOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const feature = featureKey || kind;

  if (!user) return null;

  const callDocAI = async (task: string, body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("workspace-doc-ai", {
      body: { task, ...body },
    });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return (data as any)?.result || {};
  };

  const runGenerate = async () => {
    if (!prompt.trim()) return;
    setError(null);
    emitAIFill({ status: "writing", section: `${LABEL[kind]} from your prompt` });
    setBusy("generate");
    try {
      const q = await consumeDailyAI(feature);
      if (!q.allowed) {
        emitAIFill({ status: "exhausted", section: `${LABEL[kind]}` });
        setExhaustedOpen(true);
        return;
      }
      const result = await callDocAI(TASK_BY_KIND[kind], { prompt, state });
      onPatch(result as Partial<S>);
      emitAIFill({ status: "done" });
    } catch (e: any) {
      const msg = e?.message || String(e);
      setError(msg);
      emitAIFill({ status: "error", message: msg });
    } finally {
      setBusy(null);
    }
  };

  const runPolish = async () => {
    setError(null);
    emitAIFill({ status: "writing", section: `${LABEL[kind]} polish` });
    setBusy("polish");
    try {
      const q = await consumeDailyAI(feature);
      if (!q.allowed) {
        emitAIFill({ status: "exhausted", section: `${LABEL[kind]}` });
        setExhaustedOpen(true);
        return;
      }
      const result = await callDocAI("tool_polish_full", { state, section: LABEL[kind] });
      onPatch(result as Partial<S>);
      emitAIFill({ status: "done" });
    } catch (e: any) {
      const msg = e?.message || String(e);
      setError(msg);
      emitAIFill({ status: "error", message: msg });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="mb-5 print:hidden">
        <div className="rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white shadow">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-violet-700">AI {LABEL[kind]} Studio</div>
                <div className="text-sm font-semibold text-slate-900 leading-tight">
                  {isPaid ? "Describe it once — AI fills the whole document" : "Polish & auto-fill with AI"}
                </div>
              </div>
            </div>
            {canTemplate && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTmplOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-violet-200 bg-white text-xs font-semibold text-violet-800 hover:bg-violet-50 transition"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  Template
                  <ChevronDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {tmplOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="absolute right-0 top-9 z-30 w-64 rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden"
                    >
                      {templates!.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => { onTemplateChange?.(t.id); setTmplOpen(false); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 flex items-center justify-between"
                        >
                          <span className="text-slate-800">{t.label}</span>
                          {currentTemplateId === t.id && <Check className="w-3.5 h-3.5 text-violet-700" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Prompt box (Pro+) */}
          {isPaid ? (
            <div className="space-y-2">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    kind === "invoice"
                      ? "e.g. Invoice ACME for 3 days of UX consulting at ₹15,000/day, GST 18%, due in 7 days"
                      : kind === "proposal"
                        ? "e.g. Shopify redesign for a DTC skincare brand, 6-week timeline, ₹8L budget"
                        : "e.g. NDA between my studio and a UK contractor for a 3-month design sprint"
                  }
                  rows={3}
                  className={cn(
                    "w-full rounded-lg border border-violet-200 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400",
                    "focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none",
                    busy === "generate" && "ring-2 ring-violet-300",
                  )}
                  disabled={busy !== null}
                />
                {busy === "generate" && (
                  <span aria-hidden className="absolute bottom-3 right-3 inline-block w-[2px] h-4 bg-violet-700 animate-pulse" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={runGenerate}
                  disabled={!prompt.trim() || busy !== null}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-semibold shadow hover:opacity-95 disabled:opacity-50 transition"
                >
                  {busy === "generate" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  {busy === "generate" ? "AI is writing…" : `Generate ${LABEL[kind]}`}
                </button>
                <button
                  type="button"
                  onClick={runPolish}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-violet-200 bg-white text-xs font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-50 transition"
                >
                  {busy === "polish" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Make it good with AI
                </button>
                <span className="text-[11px] text-slate-500 ml-auto">
                  Tip: AI uses everything you've already typed as context.
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-600">
                On the free plan you get <b>3 AI assists/day</b>. Polish your draft once, or upgrade to Pro to describe it in one prompt.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={runPolish}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  {busy === "polish" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Make it good with AI
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/workspaces/ai-settings")}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-violet-200 text-violet-700 hover:bg-violet-50 text-xs font-semibold transition"
                >
                  <KeyRound className="w-3.5 h-3.5" /> BYOK · unlimited
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/plans")}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100 text-xs font-semibold transition"
                >
                  <Crown className="w-3.5 h-3.5" /> Upgrade for prompt mode
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>
      </div>
      <CreditsExhaustedDialog
        open={exhaustedOpen}
        onClose={() => setExhaustedOpen(false)}
        toolName={`${LABEL[kind]} Generator`}
      />
    </>
  );
}

export default DashboardToolAIPanel;