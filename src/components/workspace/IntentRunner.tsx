import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Sparkles, Save, Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useRecordOutput } from "@/lib/workspace/outputs";
import { useToast } from "@/hooks/use-toast";

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
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            AI-generated deliverable for <span className="font-medium text-foreground/80">{workspace?.client_name || "this project"}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-muted/20 p-4 min-h-[200px]">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating with your AI provider…
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {!loading && !error && markdown && (
            <article className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{markdown}</ReactMarkdown>
            </article>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!markdown || loading}>
            {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!markdown || loading || saved}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saved ? "Saved to outputs" : "Save to project"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}