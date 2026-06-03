import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import {
  Block, Revision, Annotation, StudioDocument,
  extractPdfText, uploadSourcePdf, parsePdf, revisePdf,
  listDocuments, listRevisions, listAnnotations,
  ensureShareLink,
} from "@/lib/pdf-studio/api";
import {
  FileUp, Sparkles, Share2, MessageSquare, History, Loader2, Copy, Check, FileText, Upload, Plus,
} from "lucide-react";

/**
 * PDF Studio — upload an existing PDF and revise it with AI.
 * Tier-gated (Pro+) by edge function. Sits in the workspace tools shell.
 */
export default function PdfStudio() {
  const { toast } = useToast();
  const [sp, setSp] = useSearchParams();

  const [docs, setDocs] = useState<StudioDocument[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(sp.get("doc"));
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [activeRev, setActiveRev] = useState<Revision | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [shareSlug, setShareSlug] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [instr, setInstr] = useState("");
  const [reviseLoading, setReviseLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { listDocuments().then(setDocs).catch(() => {}); }, []);

  useEffect(() => {
    if (!activeDocId) { setRevisions([]); setActiveRev(null); setAnnotations([]); setShareSlug(null); return; }
    setSp(p => { p.set("doc", activeDocId); return p; }, { replace: true });
    Promise.all([
      listRevisions(activeDocId),
      listAnnotations(activeDocId),
      ensureShareLink(activeDocId).catch(() => null),
    ]).then(([revs, anns, slug]) => {
      setRevisions(revs); setActiveRev(revs[0] ?? null); setAnnotations(anns); setShareSlug(slug);
    });
    // realtime annotations
    const ch = supabase.channel(`pdf-studio-ann-${activeDocId}`).on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "pdf_studio_annotations", filter: `document_id=eq.${activeDocId}` },
      (payload) => {
        const row = payload.new as any as Annotation;
        setAnnotations((prev) => [row, ...prev]);
        toast({ title: "New client annotation", description: row.comment.slice(0, 80) });
      },
    ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeDocId]);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "PDF only for now", description: "Please upload a .pdf file.", variant: "destructive" }); return;
    }
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { toast({ title: "Sign in required" }); return; }
      const text = await extractPdfText(file);
      if (!text || text.length < 20) {
        toast({ title: "Couldn't read PDF", description: "Looks like a scanned PDF without selectable text.", variant: "destructive" });
        return;
      }
      const path = await uploadSourcePdf(u.user.id, file).catch(() => null);
      const res = await parsePdf({
        title: file.name.replace(/\.pdf$/i, ""),
        raw_text: text, source_path: path,
      });
      toast({ title: "Document parsed", description: `Revision 1 ready · ${res.blocks.length} blocks.` });
      const newDocs = await listDocuments(); setDocs(newDocs);
      setActiveDocId(res.document_id);
    } catch (e: any) {
      toast({ title: "Parse failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally { setUploading(false); }
  };

  const handleRevise = async () => {
    if (!activeDocId || !instr.trim()) return;
    setReviseLoading(true);
    try {
      await revisePdf(activeDocId, instr.trim());
      setInstr("");
      const revs = await listRevisions(activeDocId);
      setRevisions(revs); setActiveRev(revs[0] ?? null);
      toast({ title: `Revision ${revs[0]?.version} created` });
    } catch (e: any) {
      toast({ title: "Revision failed", description: e?.message ?? "Unknown", variant: "destructive" });
    } finally { setReviseLoading(false); }
  };

  const shareUrl = useMemo(() => shareSlug ? `${window.location.origin}/s/pdf/${shareSlug}` : "", [shareSlug]);
  const copyShare = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
    toast({ title: "Link copied", description: "Share with your client to collect annotations." });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEO title="PDF Studio | HustleAI Workspace" description="Upload your PDF and let AI revise it. Versioned, shareable, annotatable." path="/tools/pdf-studio" noindex />
      <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 lg:p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full px-2.5 py-1">
                <Sparkles className="h-3.5 w-3.5" /> Pro feature · Revise instead of redo
              </div>
              <h1 className="mt-3 text-2xl lg:text-3xl font-display font-bold text-slate-900">PDF Studio</h1>
              <p className="mt-1 text-sm text-slate-600 max-w-2xl">
                Upload an existing proposal, invoice or contract. AI parses it into editable blocks.
                Type a request like <span className="italic">"change total to 5k"</span> — get Revision 2 in seconds.
                Share via public link. Clients annotate. You revise again.
              </p>
            </div>
            <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Parsing…" : "Upload PDF"}
              <input type="file" accept="application/pdf,.pdf" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
          </div>
        </div>

        {!activeDocId ? (
          <EmptyOrLibrary docs={docs} onPick={setActiveDocId} onUpload={handleFile} uploading={uploading} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_340px] gap-4">
            {/* Revision rail */}
            <aside className="rounded-2xl bg-white border border-slate-200 p-3 h-fit">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mb-2">
                <History className="h-3.5 w-3.5" /> Revisions
              </div>
              <ul className="space-y-1">
                {revisions.map((r) => (
                  <li key={r.id}>
                    <button onClick={() => setActiveRev(r)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        activeRev?.id === r.id ? "bg-emerald-50 text-emerald-900 border border-emerald-200" : "hover:bg-slate-50 text-slate-700"
                      }`}>
                      <div className="font-semibold">v{r.version}</div>
                      <div className="text-[11px] text-slate-500 truncate">{r.ai_instruction || "Initial parse"}</div>
                    </button>
                  </li>
                ))}
              </ul>
              <button onClick={() => { setActiveDocId(null); setSp(p => { p.delete("doc"); return p; }, { replace: true }); }}
                className="mt-3 w-full text-xs text-slate-500 hover:text-slate-800 px-2 py-1.5">
                ← Back to library
              </button>
            </aside>

            {/* Canvas */}
            <section className="rounded-2xl bg-white border border-slate-200 p-6 lg:p-10 min-h-[60vh]">
              {activeRev ? <BlockCanvas blocks={activeRev.blocks_json} /> : (
                <div className="text-sm text-slate-500">Pick a revision from the left.</div>
              )}
            </section>

            {/* Right panel */}
            <aside className="rounded-2xl bg-white border border-slate-200 p-4">
              <Tabs defaultValue="ai">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="ai"><Sparkles className="h-3.5 w-3.5 mr-1" />AI</TabsTrigger>
                  <TabsTrigger value="ann"><MessageSquare className="h-3.5 w-3.5 mr-1" />Notes <span className="ml-1 text-[10px] bg-slate-100 rounded px-1">{annotations.length}</span></TabsTrigger>
                  <TabsTrigger value="share"><Share2 className="h-3.5 w-3.5 mr-1" />Share</TabsTrigger>
                </TabsList>

                <TabsContent value="ai" className="space-y-3 mt-3">
                  <p className="text-xs text-slate-500">Describe what changes you want. AI creates a new revision.</p>
                  <Textarea value={instr} onChange={(e) => setInstr(e.target.value)} rows={5}
                    placeholder="e.g. Change total from 20,000 to 5,000. Update payment terms to Net 15. Add a thank-you note." />
                  <Button disabled={reviseLoading || !instr.trim()} onClick={handleRevise} className="w-full">
                    {reviseLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Create Revision {(revisions[0]?.version ?? 1) + 1}
                  </Button>
                </TabsContent>

                <TabsContent value="ann" className="space-y-2 mt-3 max-h-[60vh] overflow-auto">
                  {annotations.length === 0 && <p className="text-xs text-slate-500">No annotations yet. Share the link and your client can highlight changes.</p>}
                  {annotations.map((a) => (
                    <div key={a.id} className="rounded-lg border border-slate-200 p-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-slate-800">{a.client_name || "Client"}</div>
                        <div className="text-slate-400">{new Date(a.created_at).toLocaleString()}</div>
                      </div>
                      <div className="text-slate-600 mt-1">{a.comment}</div>
                      {a.anchor_json?.block_id && (
                        <div className="text-[10px] text-slate-400 mt-1">on block {a.anchor_json.block_id}</div>
                      )}
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="share" className="space-y-3 mt-3">
                  <p className="text-xs text-slate-500">Share with clients in 1 second. They open the link, leave annotations — no download needed.</p>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={shareUrl} className="text-xs" />
                    <Button size="icon" variant="outline" onClick={copyShare}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <a href={shareUrl} target="_blank" rel="noreferrer">Preview shared view</a>
                  </Button>
                  <p className="text-[11px] text-slate-400">Link always points to the latest revision. Re-share is unnecessary.</p>
                </TabsContent>
              </Tabs>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyOrLibrary({ docs, onPick, onUpload, uploading }: {
  docs: StudioDocument[]; onPick: (id: string) => void; onUpload: (f: File) => void; uploading: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <label className={`rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-400 transition ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
        {uploading ? <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" /> : <FileUp className="h-10 w-10 text-emerald-600" />}
        <div className="mt-3 font-semibold text-slate-900">Drop a PDF or click to upload</div>
        <div className="text-xs text-slate-500 mt-1">Proposals, invoices, contracts — anything text-based.</div>
        <input type="file" accept="application/pdf,.pdf" className="hidden"
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
      </label>
      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-slate-500" />
          <div className="font-semibold text-slate-900 text-sm">Your documents</div>
        </div>
        {docs.length === 0 ? (
          <div className="text-xs text-slate-500">Nothing yet — upload your first PDF.</div>
        ) : (
          <ul className="space-y-1.5">
            {docs.map((d) => (
              <li key={d.id}>
                <button onClick={() => onPick(d.id)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 border border-slate-200">
                  <div className="text-sm font-medium text-slate-900 truncate">{d.title}</div>
                  <div className="text-[11px] text-slate-500">{new Date(d.created_at).toLocaleString()}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BlockCanvas({ blocks }: { blocks: Block[] }) {
  return (
    <article className="mx-auto max-w-2xl font-serif text-slate-900 space-y-3 leading-relaxed">
      {blocks.map((b) => <BlockRenderer key={b.id} b={b} />)}
    </article>
  );
}

function BlockRenderer({ b }: { b: Block }) {
  switch (b.type) {
    case "heading":
      return <h2 className="text-xl font-bold tracking-tight mt-4">{b.text}</h2>;
    case "list":
      return <ul className="list-disc pl-6">{(b.text || "").split("\n").filter(Boolean).map((li, i) => <li key={i}>{li}</li>)}</ul>;
    case "line_item": {
      const m = b.meta || {};
      return (
        <div className="grid grid-cols-[1fr_60px_80px_80px] text-sm border-b border-slate-100 py-1.5">
          <div>{m.description || b.text}</div>
          <div className="text-right">{m.qty ?? ""}</div>
          <div className="text-right">{m.rate ?? ""}</div>
          <div className="text-right font-semibold">{m.amount ?? ""}</div>
        </div>
      );
    }
    case "total": {
      const m = b.meta || {};
      return (
        <div className="flex justify-end mt-3">
          <div className="text-right">
            <div className="text-xs uppercase text-slate-500">{m.label || "Total"}</div>
            <div className="text-2xl font-bold">{m.currency || ""} {m.amount ?? b.text}</div>
          </div>
        </div>
      );
    }
    case "signature":
      return <div className="mt-6 pt-4 border-t border-slate-300 text-sm text-slate-600 italic">{b.text}</div>;
    default:
      return <p className="text-sm">{b.text}</p>;
  }
}

void Plus;