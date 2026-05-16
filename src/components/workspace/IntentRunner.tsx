import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Sparkles, Copy, Check, ArrowUpRight, Cpu, ArrowRight, Info, Zap, Download, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useRecordOutput } from "@/lib/workspace/outputs";
import { Link } from "react-router-dom";
import { wpProjectDocs } from "@/lib/workspace/paths";
import { findIntent, PROVIDER_DISPLAY, SPEED_DISPLAY } from "@/lib/workspace/toolsCatalog";
import { nextSteps } from "@/lib/workspace/chains";
import { useOperationalMemory } from "@/lib/workspace/memory";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SyncStatusPill, type SyncPhase } from "@/components/workspace/SyncStatusPill";

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
  const [phase, setPhase] = useState<SyncPhase>("idle");
  const record = useRecordOutput();
  const meta = findIntent(intent);
  const provider = meta ? PROVIDER_DISPLAY[meta.bestWith] : null;
  const fallback = provider ? PROVIDER_DISPLAY[provider.fallback] : null;
  const speed = meta ? SPEED_DISPLAY[meta.speed] : null;
  const chain = nextSteps(intent);
  const startedAt = useRef<number>(0);

  // Quiet operational memory for this project — used to surface a single
  // calm contextual line (e.g. "Prefers Claude here · You often follow with…")
  const { memory } = useOperationalMemory({ project_id: workspace?.id, limit: 50 });
  const memProvider = memory.preferredProvider
    ? PROVIDER_DISPLAY[memory.preferredProvider.id]
    : null;
  const memChainHint = memory.topChain && memory.topChain.from.intent === intent
    ? `You usually follow this with ${memory.topChain.to.title}.`
    : null;
  const intentCount = memory.topIntents.find((t) => t.tool.intent === intent)?.count || 0;

  // Reset when dialog opens / intent swaps
  useEffect(() => {
    if (!open) return;
    setIntent(initialIntent); setLabel(initialLabel);
  }, [open, initialIntent, initialLabel]);

  // Generate on intent change
  useEffect(() => {
    if (!open) return;
    setMarkdown(""); setError(null); setSaved(false); setTitle(label); setElapsed(0); setPhase("drafting");
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
        const md = data?.markdown || "";
        setMarkdown(md);
        if (data?.title) setTitle(data.title);
        setPhase("drafted");
        // Auto-save: persistence should feel inevitable, not asked-for.
        if (md && workspace?.id) {
          setPhase("saving");
          const newTitle = data?.title || label;
          const ok = await record({
            tool: `intent:${intent}`,
            title: `${newTitle} — ${workspace?.client_name || "project"}`,
            summary: md.slice(0, 240),
            project_id: workspace?.id,
            metadata: { intent, markdown: md, chain_origin: initialIntent, auto: true },
            asAsset: true,
            asset_kind: (intent === "proposal" ? "proposal"
              : intent === "scope" ? "brief"
              : intent === "strategy" ? "strategy"
              : intent === "automation" ? "workflow"
              : "prompt") as any,
          });
          if (ok) {
            setSaved(true);
            setPhase("synced");
            // Quietly indicate memory updated a beat later.
            setTimeout(() => setPhase("memory"), 700);
          } else {
            setPhase("error");
          }
        }
      } catch (e: any) {
        setError(e?.message || "Generation failed. Try again.");
        setPhase("error");
      } finally {
        setLoading(false);
        clearInterval(tick);
      }
    })();
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, intent, workspace?.id]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  function handleDownload() {
    if (!markdown) return;
    const safe = (title || "deliverable").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const blob = new Blob([`# ${title}\n\n${markdown}\n`], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${safe}.md`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function handlePrint() {
    if (!markdown) return;
    const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=1000");
    if (!w) return;
    const html = document.getElementById("intent-runner-article")?.innerHTML || "";
    const client = workspace?.client_name ? `Prepared for ${workspace.client_name}` : "";
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>
    <style>
      :root{--ink:#0f172a;--muted:#475569;--rule:#e2e8f0;--accent:#059669}
      *{box-sizing:border-box} html,body{margin:0;padding:0;background:#fff;color:var(--ink);
        font-family:ui-serif,Georgia,'Times New Roman',serif;font-size:11.5pt;line-height:1.65;-webkit-font-smoothing:antialiased}
      .doc{max-width:720px;margin:0 auto;padding:56px 64px 80px}
      .kicker{font-family:ui-sans-serif,system-ui,sans-serif;font-size:9.5pt;letter-spacing:.22em;
        text-transform:uppercase;color:var(--muted);margin:0 0 6px}
      h1.title{font-family:ui-sans-serif,system-ui,sans-serif;font-size:24pt;line-height:1.15;
        margin:0 0 8px;letter-spacing:-.01em;font-weight:700}
      .meta{font-family:ui-sans-serif,system-ui,sans-serif;color:var(--muted);font-size:9.5pt;
        border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);
        padding:10px 0;margin:18px 0 30px;display:flex;justify-content:space-between;gap:12px}
      h1,h2,h3{font-family:ui-sans-serif,system-ui,sans-serif;letter-spacing:-.01em}
      h2{font-size:15pt;margin:28px 0 8px;padding-bottom:4px;border-bottom:1px solid var(--rule)}
      h3{font-size:12pt;margin:20px 0 6px;color:#1e293b}
      p{margin:0 0 12px}
      ul,ol{margin:0 0 14px 1.2em;padding:0} li{margin:0 0 4px}
      ul li::marker{color:var(--accent)}
      blockquote{margin:14px 0;padding:8px 14px;border-left:3px solid var(--accent);
        background:#ecfdf5;color:#064e3b;font-style:normal;border-radius:0 6px 6px 0}
      table{width:100%;border-collapse:collapse;font-size:10pt;margin:12px 0}
      th,td{border:1px solid var(--rule);padding:6px 8px;text-align:left}
      th{background:#f8fafc}
      code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:9.5pt;
        background:#f1f5f9;padding:1px 4px;border-radius:3px}
      pre{background:#0f172a;color:#e2e8f0;padding:12px 14px;border-radius:6px;overflow:auto;font-size:9.5pt}
      hr{border:0;border-top:1px solid var(--rule);margin:24px 0}
      .foot{margin-top:48px;padding-top:14px;border-top:1px solid var(--rule);
        font-family:ui-sans-serif,system-ui,sans-serif;color:var(--muted);font-size:9pt;
        display:flex;justify-content:space-between}
      @page{margin:18mm}
      @media print {.no-print{display:none}}
    </style></head><body>
    <div class="doc">
      <p class="kicker">Deliverable</p>
      <h1 class="title">${title}</h1>
      <div class="meta"><span>${client}</span><span>${new Date().toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})}</span></div>
      <article>${html}</article>
      <div class="foot"><span>Prepared in workspace</span><span>${provider?.label ? provider.label + " · " : ""}AI-assisted</span></div>
    </div>
    <script>window.onload=()=>setTimeout(()=>window.print(),120)</script>
    </body></html>`);
    w.document.close();
  }

  function continueChain(step: { intent: string; tool: { title: string } }) {
    setIntent(step.intent);
    setLabel(step.tool.title);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-border bg-gradient-to-br from-emerald-500/[0.05] via-transparent to-slate-500/[0.04]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <Sparkles className="h-4 w-4 text-emerald-500" /> {title}
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

          {/* Contextual memory line — only when we actually know something */}
          {(memProvider || memChainHint || intentCount > 1) && (
            <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
              <span className="inline-block h-1 w-1 rounded-full bg-primary/60 align-middle mr-1.5" />
              {intentCount > 1 && <span>Drafted this {intentCount}× for this project. </span>}
              {memProvider && memory.preferredProvider!.id !== meta?.bestWith && (
                <span>This project usually leans on <span className="font-semibold text-foreground/80">{memProvider.label}</span>. </span>
              )}
              {memChainHint && <span className="italic">{memChainHint}</span>}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-[240px] bg-background">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-500" /> {provider?.label || "AI"} is drafting your {title.toLowerCase()}…
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!loading && !error && markdown && (
            <>
              {/* Deliverable header — makes outputs feel client-sendable, not chat */}
              <div className="mb-5 pb-4 border-b border-border/60">
                <p className="text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground/80 font-semibold">Deliverable</p>
                <h1 className="mt-1 text-[22px] font-bold tracking-tight leading-tight text-foreground">{title}</h1>
                <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                  <span>{workspace?.client_name ? `Prepared for ${workspace.client_name}` : "Internal draft"}</span>
                  <span>{new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
              </div>
              <article id="intent-runner-article" className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-xl prose-h2:text-[15px] prose-h2:mt-7 prose-h2:pb-1 prose-h2:border-b prose-h2:border-border/50 prose-h3:text-sm prose-h3:mt-5 prose-p:leading-[1.7] prose-li:marker:text-emerald-500 prose-li:my-1 prose-table:text-xs prose-strong:text-foreground prose-blockquote:border-l-emerald-500 prose-blockquote:bg-emerald-500/5 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:not-italic prose-blockquote:rounded-r-md prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none prose-hr:border-border/60">
                <ReactMarkdown>{markdown}</ReactMarkdown>
              </article>

              {/* Continue the flow rail — operational continuity */}
              {chain.length > 0 && (
                <div className="mt-8 pt-5 border-t border-border">
                  <div className="flex items-center gap-1.5 mb-3">
                    <ArrowRight className="h-3.5 w-3.5 text-emerald-500" />
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Continue the flow</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {chain.slice(0, 4).map((step) => {
                      const p = PROVIDER_DISPLAY[step.tool.bestWith];
                      return (
                        <button
                          key={step.intent}
                          onClick={() => continueChain(step)}
                          className="group text-left rounded-lg border border-border hover:border-emerald-500/40 hover:bg-emerald-500/[0.03] transition-all p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-semibold text-[13px] tracking-tight leading-tight">{step.tool.title}</div>
                            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-500 transition-colors shrink-0 mt-0.5" />
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

        <div className="flex items-center justify-between gap-2 px-6 py-2.5 border-t border-border bg-gradient-to-r from-emerald-500/[0.025] via-muted/30 to-transparent">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground min-w-0">
            <SyncStatusPill phase={phase} hint={loading ? `${elapsed.toFixed(1)}s` : undefined} />
            {saved && workspace?.id && (
              <Link to={wpProjectDocs(workspace.id)} className="hidden sm:inline-flex items-center gap-1 text-emerald-600 hover:underline font-medium">
                Open in Library <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!markdown || loading} className="h-8">
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownload} disabled={!markdown || loading} className="h-8">
              <Download className="h-3.5 w-3.5 mr-1.5" /> .md
            </Button>
            <Button size="sm" onClick={handlePrint} disabled={!markdown || loading} className="h-8 bg-emerald-600 hover:bg-emerald-600/90 text-white">
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Export PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
