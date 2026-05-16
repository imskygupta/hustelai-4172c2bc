import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Sparkles, Save, Copy, Check, ArrowUpRight, Cpu, ArrowRight, Info, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useRecordOutput } from "@/lib/workspace/outputs";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { wp, wpProjectDocs } from "@/lib/workspace/paths";
import { findIntent, PROVIDER_DISPLAY, SPEED_DISPLAY } from "@/lib/workspace/toolsCatalog";
import { nextSteps } from "@/lib/workspace/chains";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * IntentRunner — inline AI deliverable generator + operational chain.
 *
 * Supports in-place "Continue the flow" — clicking a next-step swaps the
 * current intent and re-runs without unmounting the dialog. This keeps the
 * operator in flow instead of bouncing between routes.
 */
export function IntentRunner({
  open,
  onClose,
  intent: initialIntent,
  label: initialLabel,
  workspace,
}: {
  open: boolean;
  onClose: () => void;
  intent: string;
  label: string;
  workspace: any;
}) {
  const [intent, setIntent] = useState(initialIntent);
  const [label, setLabel] = useState(initialLabel);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initialLabel);
  const [markdown, setMarkdown] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const record = useRecordOutput();
  const { toast } = useToast();
  const meta = findIntent(intent);
  const provider = meta ? PROVIDER_DISPLAY[meta.bestWith] : null;
  const fallback = provider ? PROVIDER_DISPLAY[provider.fallback] : null;
  const speed = meta ? SPEED_DISPLAY[meta.speed] : null;
  const chain = nextSteps(intent);
  const startedAt = useRef<number>(0);

  // Reset when dialog opens / intent swaps
  useEffect(() => {
    if (!open) return;
    setIntent(initialIntent); setLabel(initialLabel);
  }, [open, initialIntent, initialLabel]);

  // Generate on intent change
  useEffect(() => {
    if (!open) return;
    setMarkdown(""); setError(null); setSaved(false); setTitle(label); setElapsed(0);
    startedAt.current = Date.now();
    const tick = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 100) / 10), 100);
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("workspace-ai", {
          body: {
            action: "generate_intent",
            intent,
            workspace: {
              id: workspace?.id,
              client_name: workspace?.client_name,
              company_name: workspace?.company_name,
              pipeline_stage: workspace?.pipeline_stage,
              project_scope: workspace?.project_scope,
              deliverables: workspace?.deliverables,
              tags: workspace?.tags,
              pricing: workspace?.pricing,
            },
          },
        });
        if (error) throw error;
        setMarkdown(data?.markdown || "");
        if (data?.title) setTitle(data.title);
      } catch (e: any) {
        setError(e?.message || "Generation failed. Try again.");
      } finally {
        setLoading(false);
        clearInterval(tick);
      }
    })();
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, intent, workspace?.id]);

  async function handleSave() {
    if (!markdown) return;
    const out = await record({
      tool: `intent:${intent}`,
      title: `${title} — ${workspace?.client_name || "project"}`,
      summary: markdown.slice(0, 240),
      project_id: workspace?.id,
      metadata: { intent, markdown, chain_origin: initialIntent },
      asAsset: true,
      asset_kind: (intent === "proposal" ? "proposal"
        : intent === "scope" ? "brief"
        : intent === "strategy" ? "strategy"
        : intent === "automation" ? "workflow"
        : "prompt") as any,
    });
    if (out) {
      setSaved(true);
      toast({ title: "Saved", description: "Added to project outputs." });
    } else {
      toast({ title: "Couldn't save", description: "Try again in a moment.", variant: "destructive" });
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  function continueChain(step: { intent: string; tool: { title: string } }) {
    setIntent(step.intent);
    setLabel(step.tool.title);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-border bg-gradient-to-br from-primary/[0.04] via-transparent to-violet-500/[0.04]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <Sparkles className="h-4 w-4 text-primary" /> {title}
            </DialogTitle>
            <DialogDescription className="text-[12px] text-muted-foreground">
              AI-generated deliverable for <span className="font-medium text-foreground/80">{workspace?.client_name || "this project"}</span>.
            </DialogDescription>
          </DialogHeader>

          {/* Provider intelligence rail */}
          {(provider || speed) && (
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              {provider && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${provider.tint} hover:opacity-90 transition-opacity`}>
                      <Cpu className="h-2.5 w-2.5" /> {provider.label}
                      <Info className="h-2.5 w-2.5 opacity-60" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 text-[12px] space-y-2 p-3" align="start">
                    <div className="flex items-center justify-between">
                      <span className="font-bold tracking-tight">{provider.label}</span>
                      <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${provider.tint}`}>Primary</span>
                    </div>
                    <p className="text-foreground/80 leading-relaxed">{provider.strength}</p>
                    <p className="text-muted-foreground leading-relaxed">{provider.tradeoff}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-border text-[11px]">
                      <span className="text-muted-foreground inline-flex items-center gap-1"><Zap className="h-3 w-3" /> ~{provider.latencyMs[0]}–{provider.latencyMs[1]}ms</span>
                      {fallback && (
                        <span className="text-muted-foreground">Falls back → <span className="font-semibold text-foreground/80">{fallback.label}</span></span>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              {speed && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border bg-background text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${speed.dot}`} /> {speed.label}
                </span>
              )}
              {loading && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground">{elapsed.toFixed(1)}s</span>
              )}
              {meta?.why && (
                <span className="text-[10.5px] text-muted-foreground italic ml-1 truncate">{meta.why}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-[240px] bg-background">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> {provider?.label || "AI"} is drafting your {title.toLowerCase()}…
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!loading && !error && markdown && (
            <>
              <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-xl prose-h2:text-base prose-h2:mt-5 prose-h3:text-sm prose-p:leading-relaxed prose-li:marker:text-primary prose-table:text-xs prose-strong:text-foreground prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:not-italic">
                <ReactMarkdown>{markdown}</ReactMarkdown>
              </article>

              {/* Continue the flow rail — operational continuity */}
              {chain.length > 0 && (
                <div className="mt-8 pt-5 border-t border-border">
                  <div className="flex items-center gap-1.5 mb-3">
                    <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Continue the flow</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {chain.slice(0, 4).map((step) => {
                      const p = PROVIDER_DISPLAY[step.tool.bestWith];
                      return (
                        <button
                          key={step.intent}
                          onClick={() => continueChain(step)}
                          className="group text-left rounded-lg border border-border hover:border-primary/40 hover:bg-primary/[0.03] transition-all p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-semibold text-[13px] tracking-tight leading-tight">{step.tool.title}</div>
                            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{step.reason}</p>
                          {p && (
                            <span className={`mt-2 inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${p.tint}`}>
                              <Cpu className="h-2.5 w-2.5" /> {p.label}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-3 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {saved ? (
              <Link to={workspace?.id ? wpProjectDocs(workspace.id) : wp("blocks")} className="inline-flex items-center gap-1 text-primary hover:underline font-medium">
                Open in Library <ArrowUpRight className="h-3 w-3" />
              </Link>
            ) : (
              <span>Outputs auto-sync to Docs & Assets when saved.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!markdown || loading}>
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!markdown || loading || saved}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saved ? "Saved" : "Save to project"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
