import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Loader2, ArrowLeft, ArrowRight, Check, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

type Brief = {
  client_name?: string;
  client_company?: string | null;
  client_contact?: string | null;
  project_scope?: string;
  deliverables?: string[];
  timeline?: { milestone: string; due: string }[];
  pricing?: { model?: string; amount?: number | null; currency?: string };
  payment_structure?: string;
  risks?: string[];
  next_actions?: string[];
  summary?: string;
};

const PROMPTS = [
  "Just got a new client — what should I tell you?",
  "Drop the project details. Be messy. AI will clean it up.",
  "Who is the client, what do they want, when, and for how much?",
];

export default function NewWorkspace() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<"intake" | "extracting" | "review">("intake");
  const [input, setInput] = useState("");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [provider, setProvider] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

  async function extract() {
    if (input.trim().length < 10) {
      toast.error("Add a few more details so the AI can extract a solid brief.");
      return;
    }
    setStep("extracting");
    const { data, error } = await supabase.functions.invoke("workspace-intake", {
      body: { input, action: "extract" },
    });
    if (error || !data?.ok) {
      toast.error(data?.error || error?.message || "AI extraction failed");
      setStep("intake");
      return;
    }
    setBrief(data.brief || {});
    setProvider(data.used_provider || "");
    setStep("review");
  }

  async function save() {
    if (!user || !brief) return;
    setSaving(true);
    const { data, error } = await (supabase as any).from("workspaces").insert({
      owner_id: user.id,
      client_name: brief.client_name || "Untitled client",
      project_scope: brief.project_scope || null,
      deliverables: brief.deliverables || [],
      deadlines: brief.timeline || [],
      pricing: brief.pricing || {},
      payment_terms: { structure: brief.payment_structure || "" },
      ai_summary: brief.summary || null,
      source_inputs: [{ kind: "intake_chat", input, at: new Date().toISOString() }],
      status: "active",
    }).select("id").single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Workspace created");
    nav(`/workspaces/${data.id}`);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <AnimatePresence mode="wait">
        {step === "intake" && (
          <motion.div
            key="intake"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <motion.div
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/40 items-center justify-center shadow-xl shadow-primary/30 mb-2"
              >
                <Sparkles className="h-7 w-7 text-primary-foreground" />
              </motion.div>
              <h2 className="text-3xl font-semibold tracking-tight">{prompt}</h2>
              <p className="text-sm text-muted-foreground">
                The AI intake assistant will extract scope, deliverables, timeline, pricing & risks — automatically.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-2 shadow-xl shadow-black/5">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                rows={10}
                placeholder={`e.g.\n"Got a new client Aman from a Mumbai D2C skincare brand. They need a 5-page Shopify site + email automation. Budget around ₹40k. Wants it in 3 weeks. Pays 50% upfront."`}
                className="border-0 focus-visible:ring-0 resize-none text-base bg-transparent"
              />
            </div>

            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">Tip: messier is fine — the AI will structure it.</p>
              <button
                onClick={extract}
                disabled={input.trim().length < 5}
                className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium shadow-lg shadow-primary/30 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform"
              >
                <Wand2 className="h-4 w-4" /> Extract structured brief
              </button>
            </div>
          </motion.div>
        )}

        {step === "extracting" && (
          <motion.div key="ex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
            <p className="text-lg font-medium">AI is structuring your brief…</p>
            <p className="text-sm text-muted-foreground mt-1">Extracting scope, deliverables, pricing, risks.</p>
          </motion.div>
        )}

        {step === "review" && brief && (
          <motion.div key="rev" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="flex items-center justify-between">
              <button onClick={() => setStep("intake")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Edit input
              </button>
              {provider && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">via {provider}</span>}
            </div>

            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-background p-6 space-y-5">
              <Field label="Client" value={brief.client_name} />
              {brief.client_company && <Field label="Company" value={brief.client_company} />}
              <Field label="Project scope" value={brief.project_scope} multiline />
              {!!brief.deliverables?.length && (
                <ListField label="Deliverables" items={brief.deliverables} />
              )}
              {!!brief.timeline?.length && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Timeline</p>
                  <ul className="space-y-1.5 text-sm">
                    {brief.timeline.map((t, i) => (
                      <li key={i} className="flex justify-between border-b border-border/40 pb-1">
                        <span>{t.milestone}</span>
                        <span className="text-muted-foreground">{t.due}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {brief.pricing && (
                <Field
                  label="Pricing"
                  value={`${brief.pricing.currency || "INR"} ${brief.pricing.amount ?? "—"} (${brief.pricing.model || "unknown"})`}
                />
              )}
              {brief.payment_structure && <Field label="Payment structure" value={brief.payment_structure} />}
              {!!brief.risks?.length && <ListField label="Risks" items={brief.risks} />}
              {!!brief.next_actions?.length && <ListField label="Next actions" items={brief.next_actions} />}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium shadow-lg shadow-primary/30 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save workspace
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, value, multiline }: { label: string; value: any; multiline?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className={multiline ? "text-sm leading-relaxed" : "text-sm font-medium"}>{value}</p>
    </div>
  );
}

function ListField({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
      <ul className="space-y-1 text-sm">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2"><span className="text-primary">•</span>{it}</li>
        ))}
      </ul>
    </div>
  );
}