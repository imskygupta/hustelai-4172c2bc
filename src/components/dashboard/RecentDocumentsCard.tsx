import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, ArrowUpRight, Receipt, ShieldAlert, ClipboardList, Sparkles } from "lucide-react";
import { listDocuments, type StudioDocument } from "@/lib/pdf-studio/api";
import { failOpen } from "@/lib/async/timeout";

/**
 * RecentDocumentsCard — calm "Section 5: Documents" tile that surfaces the
 * 4 most recent items from the unified document editor (proposal / contract /
 * NDA / invoice / quotation). Empty state nudges to create the first doc.
 */

const KIND_ICON: Record<string, typeof FileText> = {
  proposal: FileText,
  invoice: Receipt,
  contract: ShieldAlert,
  nda: ShieldAlert,
  quotation: ClipboardList,
};

function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  const d = Math.max(0, Date.now() - t);
  const m = Math.floor(d / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export default function RecentDocumentsCard() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<StudioDocument[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await failOpen(() => listDocuments(), [] as StudioDocument[], "dashboard.recentDocs");
      if (!cancelled) setDocs((data || []).slice(0, 4));
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-semibold text-sm text-foreground">Recent documents</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Proposals, contracts, invoices & more — one editor.</p>
        </div>
        <Link to="/workspace-os/pdf-studio" className="text-[11px] uppercase tracking-wider font-semibold text-primary inline-flex items-center gap-1 hover:underline">
          See all <ArrowUpRight className="w-3 h-3" />
        </Link>
      </header>

      {docs === null ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl border border-border/60 bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <button
          onClick={() => navigate("/workspace-os/pdf-studio")}
          className="w-full rounded-xl border border-dashed border-border bg-background/40 px-4 py-6 text-left hover:border-primary/40 hover:bg-primary/[0.03] transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500/15 to-violet-500/10 items-center justify-center">
              <Sparkles className="h-4 w-4 text-emerald-600" />
            </span>
            <div>
              <div className="text-sm font-medium tracking-tight">Create your first document</div>
              <div className="text-xs text-muted-foreground mt-0.5">Upload a PDF or start blank — AI handles the rest.</div>
            </div>
          </div>
        </button>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {docs.map(d => {
            const Icon = KIND_ICON[d.doc_kind || ""] || FileText;
            return (
              <button
                key={d.id}
                onClick={() => navigate(`/workspace-os/pdf-studio?doc=${d.id}`)}
                className="group text-left rounded-xl border border-border/60 bg-background/40 p-3 hover:border-primary/40 hover:bg-primary/[0.03] transition-all"
              >
                <div className="flex items-start gap-2.5">
                  <span className="inline-flex h-8 w-8 shrink-0 rounded-lg bg-muted items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium tracking-tight truncate">{d.title || "Untitled"}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <span className="capitalize">{d.doc_kind || "document"}</span>
                      <span className="opacity-50">·</span>
                      <span>{relTime(d.created_at)}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}