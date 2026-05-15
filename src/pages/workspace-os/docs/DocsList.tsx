import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DOC_META } from "@/lib/workspace-docs/types";
import type { DocType } from "@/lib/workspace-docs/types";
import { ArrowLeft, Plus, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_LABELS, STATUS_TONE, type DocStatus } from "@/lib/workspace-docs/infra";
import { wpProject, wpProjectDoc, wpProjectDocNew } from "@/lib/workspace/paths";

const TYPES: DocType[] = ["quotation", "agreement", "invoice", "proposal", "service_card", "business_card"];

export default function DocsList() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [ws, setWs] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const [w, d] = await Promise.all([
        (supabase as any).from("workspaces").select("*").eq("id", id).maybeSingle(),
        (supabase as any).from("workspace_documents").select("*").eq("workspace_id", id).order("updated_at", { ascending: false }),
      ]);
      setWs(w.data);
      setDocs(d.data || []);
      setLoading(false);
    })();
  }, [user, id]);

  return (
    <div className="space-y-6">
      <Link to={wpProject(id!)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to project
      </Link>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Documents</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {ws?.client_name ? `Operational docs for ${ws.client_name}` : "Generate quotes, agreements, invoices and more."}
        </p>
      </div>

      {/* Create new */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {TYPES.map((t, i) => (
          <motion.button
            key={t}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            onClick={() => nav(wpProjectDocNew(id!, t))}
            className="rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition p-4 text-left group"
          >
            <div className="text-2xl mb-2">{DOC_META[t].icon}</div>
            <p className="font-medium text-sm">{DOC_META[t].label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{DOC_META[t].tagline}</p>
            <div className="mt-3 inline-flex items-center gap-1 text-xs text-primary opacity-60 group-hover:opacity-100">
              <Plus className="h-3 w-3" /> Create
            </div>
          </motion.button>
        ))}
      </div>

      {/* Existing */}
      <div>
        <h3 className="text-sm font-medium mb-3">Recent</h3>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 rounded-xl" /><Skeleton className="h-14 rounded-xl" />
          </div>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No documents yet — create one above.</p>
        ) : (
          <div className="space-y-2">
            {docs.map(d => (
              <Link
                key={d.id}
                to={wpProjectDoc(id!, d.id)}
                className="flex items-center gap-3 rounded-xl border border-border bg-card hover:border-primary/40 px-4 py-3 transition"
              >
                <div className="text-xl">{DOC_META[d.doc_type as DocType]?.icon || "📄"}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {DOC_META[d.doc_type as DocType]?.label} · {d.doc_number || "draft"} · {new Date(d.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${STATUS_TONE[(d.status || "draft") as DocStatus] || "bg-muted"}`}>
                  {STATUS_LABELS[(d.status || "draft") as DocStatus] || d.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}