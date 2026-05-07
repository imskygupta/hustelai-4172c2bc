import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, CheckCircle2, Archive } from "lucide-react";
import { intakeApi } from "@/lib/intake-os/api";
import { formatDistanceToNow } from "date-fns";

export default function IntakeInbox() {
  const { id } = useParams();
  const [subs, setSubs] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const load = async () => {
    try { const r = await intakeApi("submission.list", { form_id: id }); setSubs(r.rows || []); }
    catch (e: any) { toast.error(e.message); }
  };
  useEffect(() => { load(); }, [id]);

  const analyze = async () => {
    if (!active) return;
    setAnalyzing(true);
    try {
      const r = await intakeApi("submission.analyze", { id: active.id });
      setActive({ ...active, ai_analysis: r.ai_analysis });
      toast.success("AI analysis complete");
    } catch (e: any) { toast.error(e.message); }
    finally { setAnalyzing(false); }
  };
  const setStatus = async (status: string) => {
    if (!active) return;
    try {
      await intakeApi("submission.update_status", { id: active.id, status });
      setActive({ ...active, status });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <Link to="/workspaces/intake" className="text-sm text-muted-foreground inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> All forms</Link>
      <h2 className="text-2xl font-semibold">Submissions</h2>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <div className="space-y-1.5">
          {subs.length === 0 && <p className="text-sm text-muted-foreground">No submissions yet.</p>}
          {subs.map(s => (
            <button key={s.id} onClick={() => setActive(s)}
              className={`w-full text-left rounded-xl border p-3 transition ${active?.id === s.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate">{s.client_name || "Anonymous"}</p>
                <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{s.client_email || "—"}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}</p>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 min-h-[400px]">
          {!active ? <p className="text-sm text-muted-foreground">Select a submission to view details.</p> : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{active.client_name || "Anonymous"}</h3>
                  <p className="text-xs text-muted-foreground">{active.client_email} {active.client_company && `· ${active.client_company}`}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={analyze} disabled={analyzing}>
                    <Sparkles className="h-3.5 w-3.5 mr-1" />{analyzing ? "Analyzing..." : "AI analyze"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setStatus("converted")}><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setStatus("archived")}><Archive className="h-3.5 w-3.5" /></Button>
                </div>
              </div>

              {active.ai_analysis && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-wider text-primary font-medium">AI Analysis</p>
                  <p className="text-sm">{active.ai_analysis.summary}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge>Type: {active.ai_analysis.detected_type}</Badge>
                    <Badge variant="secondary">Urgency: {active.ai_analysis.urgency}</Badge>
                    <Badge variant="secondary">Scope: {active.ai_analysis.scope_clarity}</Badge>
                    {active.ai_analysis.suggested_price_range && <Badge variant="outline">Price: {active.ai_analysis.suggested_price_range}</Badge>}
                  </div>
                  {active.ai_analysis.risks?.length > 0 && (
                    <div><p className="text-xs font-medium mt-2">Risks</p>
                      <ul className="text-xs list-disc pl-4">{active.ai_analysis.risks.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul></div>
                  )}
                  {active.ai_analysis.next_actions?.length > 0 && (
                    <div><p className="text-xs font-medium mt-2">Next actions</p>
                      <ul className="text-xs list-disc pl-4">{active.ai_analysis.next_actions.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul></div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Submission</p>
                {Object.entries(active.payload || {}).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-border p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.replace(/_/g, " ")}</p>
                    <p className="text-sm whitespace-pre-wrap break-words">{String(v ?? "")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}