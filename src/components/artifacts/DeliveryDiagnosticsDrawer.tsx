// Admin-only diagnostics drawer for a single artifact. Shows the full FSM
// snapshot + delivery memory so on-call can answer "what happened?" in one
// glance.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRuntimeSession } from "@/lib/runtime/useRuntimeSession";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";
import { stateChipClass, type ArtifactState } from "@/lib/artifacts/fsm";

interface Diagnostics {
  id: string;
  artifact_state: ArtifactState;
  artifact_origin: string | null;
  generation_source: string | null;
  delivery_status: string | null;
  delivery_attempts: number | null;
  resend_count: number | null;
  last_delivery_at: string | null;
  last_delivery_error: string | null;
  last_transition_at: string | null;
  telegram_message_id: string | null;
  telegram_chat_id: string | null;
  telegram_deep_link: string | null;
  storage_mode: string | null;
  ref_export_id: string | null;
  source_module: string | null;
}

export function DeliveryDiagnosticsDrawer({
  artifactId, open, onOpenChange,
}: { artifactId: string | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { snapshot } = useRuntimeSession();
  const [data, setData] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !artifactId || !snapshot?.is_admin) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const { data: row } = await (supabase as any)
        .from("workspace_artifacts")
        .select("id, artifact_state, artifact_origin, generation_source, delivery_status, delivery_attempts, resend_count, last_delivery_at, last_delivery_error, last_transition_at, telegram_message_id, telegram_chat_id, telegram_deep_link, storage_mode, ref_export_id, source_module")
        .eq("id", artifactId)
        .maybeSingle();
      if (alive) {
        setData(row || null);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [artifactId, open, snapshot?.is_admin]);

  if (!snapshot?.is_admin) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-zinc-950 border-white/[0.08] text-zinc-100 w-[420px] sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-zinc-100 text-sm font-semibold">Delivery diagnostics</SheetTitle>
        </SheetHeader>
        {loading || !data ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="space-y-4 pt-4 text-[12px]">
            <Row k="Artifact ID" v={<code className="text-[10px] text-zinc-300">{data.id}</code>} />
            <Row k="State" v={
              <span className={`text-[10px] uppercase rounded px-1.5 py-0.5 ring-1 ${stateChipClass(data.artifact_state)}`}>
                {data.artifact_state}
              </span>
            } />
            <Row k="Origin" v={data.artifact_origin || "—"} />
            <Row k="Generation source" v={<code className="text-[10px]">{data.generation_source || data.source_module || "—"}</code>} />
            <hr className="border-white/[0.06]" />
            <Row k="Delivery status" v={data.delivery_status || "—"} />
            <Row k="Attempts" v={String(data.delivery_attempts ?? 0)} />
            <Row k="Resend count" v={String(data.resend_count ?? 0)} />
            <Row k="Last delivery" v={data.last_delivery_at ? new Date(data.last_delivery_at).toLocaleString() : "—"} />
            <Row k="Last error" v={<span className="text-red-300/80">{data.last_delivery_error || "—"}</span>} />
            <hr className="border-white/[0.06]" />
            <Row k="Telegram chat" v={<code className="text-[10px]">{data.telegram_chat_id || "—"}</code>} />
            <Row k="Telegram message" v={<code className="text-[10px]">{data.telegram_message_id || "—"}</code>} />
            <Row k="Deep link" v={
              data.telegram_deep_link
                ? <a href={data.telegram_deep_link} target="_blank" rel="noreferrer" className="text-emerald-300 underline break-all">{data.telegram_deep_link}</a>
                : "—"
            } />
            <Row k="Storage mode" v={data.storage_mode || "—"} />
            <Row k="Last transition" v={data.last_transition_at ? new Date(data.last_transition_at).toLocaleString() : "—"} />
            <Row k="Export ref" v={<code className="text-[10px]">{data.ref_export_id || "—"}</code>} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-zinc-500 shrink-0">{k}</span>
      <span className="text-zinc-200 text-right break-all">{v}</span>
    </div>
  );
}