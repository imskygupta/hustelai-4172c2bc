import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Sparkles, Save, Copy, Check, ArrowUpRight, Cpu } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useRecordOutput } from "@/lib/workspace/outputs";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { wp, wpProjectDocs } from "@/lib/workspace/paths";
import { findIntent, PROVIDER_DISPLAY, SPEED_DISPLAY } from "@/lib/workspace/toolsCatalog";

/**
 * IntentRunner — single dialog that turns a project "intent"
 * (scope/strategy/automation/proposal/etc) into an AI-generated
 * markdown deliverable, then lets the user save it to workspace_outputs.
 *
 * Replaces the broken navigation tiles that previously pointed at
 * canvas/blueprint/tools routes that don't exist on the workspace surface.
 */
export function IntentRunner({
  open,
  onClose,
  intent,
  label,
  workspace,
}: {
  open: boolean;
  onClose: () => void;
  intent: string;
  label: string;
  workspace: any;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(label);
  const [markdown, setMarkdown] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const record = useRecordOutput();
  const { toast } = useToast();
  const meta = findIntent(intent);
  const provider = meta ? PROVIDER_DISPLAY[meta.bestWith] : null;
  const speed = meta ? SPEED_DISPLAY[meta.speed] : null;

  useEffect(() => {
    if (!open) return;
    setMarkdown(""); setError(null); setSaved(false); setTitle(label);
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
      }
    })();
  }, [open, intent, label, workspace?.id]);

  async function handleSave() {
    if (!markdown) return;
    const out = await record({
      tool: `intent:${intent}`,
      title: `${title} — ${workspace?.client_name || "project"}`,
      summary: markdown.slice(0, 240),
      project_id: workspace?.id,
      metadata: { intent, markdown },
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-border bg-gradient-to-br from-primary/[0.03] via-transparent to-violet-500/[0.03]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Sparkles className="h-4 w-4 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            AI-generated deliverable for <span className="font-medium text-foreground/80">{workspace?.client_name || "this project"}</span>.
          </DialogDescription>
        </DialogHeader>
          {(provider || speed) && (
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              {provider && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${provider.tint}`}>
                  <Cpu className="h-2.5 w-2.5" /> {provider.label}
                </span>
              )}
              {speed && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border bg-background text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${speed.dot}`} /> {speed.label}
                </span>
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
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {!loading && !error && markdown && (
            <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-xl prose-h2:text-base prose-h2:mt-5 prose-h3:text-sm prose-p:leading-relaxed prose-li:marker:text-primary prose-table:text-xs prose-strong:text-foreground">
              <ReactMarkdown>{markdown}</ReactMarkdown>
            </article>
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
            {saved ? "Saved to outputs" : "Save to project"}
          </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}