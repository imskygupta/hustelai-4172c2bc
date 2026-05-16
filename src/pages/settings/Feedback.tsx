import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, Send, CheckCircle2, MessageSquare, Bug, Lightbulb, Sparkles, CreditCard, Zap, Brain, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";

const CATEGORIES = [
  { id: "bug",        label: "Something broke",   icon: Bug },
  { id: "ux",         label: "Confusing UX",      icon: HelpCircle },
  { id: "idea",       label: "Idea / request",    icon: Lightbulb },
  { id: "automation", label: "Automation",        icon: Zap },
  { id: "ai",         label: "AI / generation",   icon: Brain },
  { id: "billing",    label: "Billing / wallet",  icon: CreditCard },
  { id: "other",      label: "Other",             icon: Sparkles },
] as const;

export default function FeedbackPage() {
  const { toast } = useToast();
  const loc = useLocation();
  const [category, setCategory] = useState<string>("idea");
  const [message, setMessage] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [replyRequested, setReplyRequested] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  const ctx = useMemo(() => ({
    route: loc.pathname,
    workspace_id: localStorage.getItem("ws:lastWorkspaceId"),
    project_id: localStorage.getItem("ws:lastProjectId"),
  }), [loc.pathname]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("user_feedback" as any)
        .select("id, category, message, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecent((data as any[]) || []);
    })();
  }, [doneId]);

  async function submit() {
    if (message.trim().length < 4) {
      toast({ title: "Add a bit more detail", description: "Even one sentence helps us act on it.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-feedback", {
        body: {
          category,
          message: message.trim(),
          screenshot_url: screenshotUrl.trim() || null,
          reply_requested: replyRequested,
          route: ctx.route,
          workspace_id: ctx.workspace_id,
          project_id: ctx.project_id,
          meta: { ua: typeof navigator !== "undefined" ? navigator.userAgent : "", lang: navigator?.language },
        },
      });
      if (error || !(data as any)?.ok) throw new Error((data as any)?.error || error?.message || "Failed");
      setDoneId((data as any).id);
      setMessage(""); setScreenshotUrl("");
      toast({ title: "Sent to the founder", description: "We read every note. Thank you." });
    } catch (e: any) {
      toast({ title: "Couldn't send", description: e?.message || "Try again in a moment.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-0 py-6 space-y-6">
      <SEO title="Feedback | HustleAI" description="Send feedback directly to the HustleAI founder." path="/settings/feedback" noindex />

      <header className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-emerald-700">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Direct line</span>
        </div>
        <h1 className="text-2xl font-display font-bold text-slate-900">Tell us what's working — and what's not</h1>
        <p className="text-sm text-slate-500">
          Goes straight to the founder. No support queue, no ticket system.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 space-y-5">
        <div>
          <Label className="text-xs uppercase tracking-wide text-slate-500">Category</Label>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
            {CATEGORIES.map(c => {
              const Icon = c.icon;
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                    active
                      ? "border-emerald-500 bg-emerald-50/60 text-emerald-900 ring-1 ring-emerald-500/20"
                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="truncate">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fb-msg" className="text-xs uppercase tracking-wide text-slate-500">Your message</Label>
          <Textarea
            id="fb-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What happened, what you expected, or what you wish existed…"
            className="min-h-[140px] resize-y"
            maxLength={4000}
          />
          <div className="text-[11px] text-slate-400 text-right">{message.length}/4000</div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fb-shot" className="text-xs uppercase tracking-wide text-slate-500">Screenshot URL (optional)</Label>
          <Input
            id="fb-shot"
            value={screenshotUrl}
            onChange={(e) => setScreenshotUrl(e.target.value)}
            placeholder="https://… (paste any image link)"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <Checkbox checked={replyRequested} onCheckedChange={(v) => setReplyRequested(!!v)} />
          <span>Reply to me by email if useful</span>
        </label>

        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <div className="text-[11px] text-slate-400">
            Context: <code className="text-slate-500">{ctx.route}</code>
          </div>
          <Button
            onClick={submit}
            disabled={submitting || message.trim().length < 4}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1.5" /> Send</>}
          </Button>
        </div>

        {doneId && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/60 border border-emerald-200/60 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5" /> Logged. Founder pinged on Telegram.
          </div>
        )}
      </div>

      {recent.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-slate-500">Your recent notes</h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200/70 bg-white">
            {recent.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-start gap-3">
                <div className="text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-50/70 border border-emerald-200/60 rounded px-1.5 py-0.5 mt-0.5">
                  {r.category}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-800 line-clamp-2">{r.message}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(r.created_at).toLocaleString()} · {r.status}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}