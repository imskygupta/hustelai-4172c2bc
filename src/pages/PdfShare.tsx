import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { resolveShare, submitAnnotation, type Block } from "@/lib/pdf-studio/api";
import { Loader2, MessageSquarePlus, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SEO } from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";

export default function PdfShare() {
  const { slug } = useParams();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [doneIds, setDoneIds] = useState<string[]>([]);

  useEffect(() => {
    if (!slug) return;
    resolveShare(slug)
      .then((d) => { if (!d) setErr("Link not found or expired."); else setData(d); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const send = async () => {
    if (!slug || !openId || !comment.trim()) return;
    setSending(true);
    try {
      await submitAnnotation({
        slug, anchor: { block_id: openId }, comment: comment.trim(),
        client_name: name, client_email: email,
      });
      setDoneIds((p) => [...p, openId]);
      setOpenId(null); setComment("");
      toast({ title: "Sent", description: "The owner will see your note." });
    } catch (e: any) {
      toast({ title: "Couldn't send", description: e?.message ?? "Try again", variant: "destructive" });
    } finally { setSending(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (err) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">{err}</div>;

  const blocks = (data?.blocks || []) as Block[];
  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 relative">
      <SEO title={`${data.title} | Shared review`} description="Review and annotate the latest revision." path="" noindex />
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{data.title}</h1>
            <p className="text-xs text-slate-500">Revision {data.version} · click any block to leave a note</p>
          </div>
          <div className="text-[11px] text-slate-400">Powered by HustleAI</div>
        </div>
        <article className="relative bg-white rounded-2xl shadow-sm border border-slate-200 p-8 lg:p-12 font-serif text-slate-900 space-y-3 leading-relaxed">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none">
            <span className="text-[110px] font-black text-slate-200/30 rotate-[-22deg]">HUSTLEAI</span>
          </div>
          <div className="relative">
            {blocks.map((b) => (
              <button key={b.id} onClick={() => setOpenId(b.id)}
                className={`group relative block w-full text-left rounded-md px-2 py-1 -mx-2 transition ${
                  doneIds.includes(b.id) ? "bg-emerald-50/70" : "hover:bg-amber-50"
                }`}>
                <BlockView b={b} />
                <span className="opacity-0 group-hover:opacity-100 absolute right-1 top-1 text-[10px] inline-flex items-center gap-1 text-amber-700">
                  {doneIds.includes(b.id) ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <MessageSquarePlus className="h-3 w-3" />}
                  {doneIds.includes(b.id) ? "Sent" : "Comment"}
                </span>
              </button>
            ))}
          </div>
        </article>
      </div>

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Suggest a change</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Textarea autoFocus rows={4} placeholder="e.g. Can we change the total to 5k? Also remove the second paragraph."
              value={comment} onChange={(e) => setComment(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenId(null)}>Cancel</Button>
            <Button onClick={send} disabled={sending || !comment.trim()}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BlockView({ b }: { b: Block }) {
  switch (b.type) {
    case "heading": return <h2 className="text-xl font-bold tracking-tight mt-3">{b.text}</h2>;
    case "list":
      return <ul className="list-disc pl-6 text-sm">{(b.text || "").split("\n").filter(Boolean).map((li, i) => <li key={i}>{li}</li>)}</ul>;
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
    case "signature": return <div className="mt-6 pt-4 border-t border-slate-300 text-sm text-slate-600 italic">{b.text}</div>;
    default: return <p className="text-sm">{b.text}</p>;
  }
}