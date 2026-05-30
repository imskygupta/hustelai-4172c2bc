import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles, ArrowLeft, Archive, Wand2, Link2, FileText, FileSignature,
  Receipt, ListChecks, AlertTriangle, ShieldCheck,
} from "lucide-react";
import { intakeApi } from "@/lib/intake-os/api";
import { formatDistanceToNow } from "date-fns";
import {
  PIPELINE_STAGES, stageMeta, computeConfidence, confidenceTone, type PipelineStage,
} from "@/lib/intake-os/pipeline";
import { convertSubmissionToWorkspace } from "@/lib/intake-os/convert";
import { wp, wpProject, wpProjectDoc, wpProjectDocs } from "@/lib/workspace/paths";
import { useAuth } from "@/hooks/useAuth";

export default function IntakeInbox() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [subs, setSubs] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [view, setView] = useState<"list" | "pipeline">("list");
  const [converting, setConverting] = useState(false);
  const [drafting, setDrafting] = useState(false);

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

  const archive = async () => {
    if (!active) return;
    try {
      await intakeApi("submission.update_status", { id: active.id, status: "archived" });
      setActive({ ...active, status: "archived" });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const setStage = async (sub: any, stage: PipelineStage) => {
    try {
      await intakeApi("submission.set_stage", { id: sub.id, stage });
      setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, pipeline_stage: stage } : s));
      if (active?.id === sub.id) setActive({ ...active, pipeline_stage: stage });
    } catch (e: any) { toast.error(e.message); }
  };

  const generatePortal = async () => {
    if (!active) return;
    try {
      const r = await intakeApi("submission.generate_portal_link", { id: active.id });
      const url = `${window.location.origin}/portal/${r.token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Portal link copied");
      setActive({ ...active, portal_token: r.token });
    } catch (e: any) { toast.error(e.message); }
  };

  const convert = async () => {
    if (!active || !user) return;
    setConverting(true);
    try {
      const { workspaceId } = await convertSubmissionToWorkspace(active, user.id);
      toast.success("Workspace + draft docs created");
      load();
      nav(wpProject(workspaceId));
    } catch (e: any) { toast.error(e.message); }
    finally { setConverting(false); }
  };

  // P1 — "Generate Proposal" must produce a real proposal document, linked
  // to a workspace + intake submission. If the lead already has a workspace
  // from a prior convert, navigate to its docs list; otherwise convert now
  // and jump straight to the freshly seeded proposal draft.
  const generateProposal = async () => {
    if (!active || !user) return;
    setDrafting(true);
    try {
      if (active.converted_workspace_id) {
        nav(wpProjectDocs(active.converted_workspace_id));
        return;
      }
      const { workspaceId, proposalDocId } = await convertSubmissionToWorkspace(active, user.id);
      toast.success("Proposal drafted from this lead");
      load();
      nav(proposalDocId ? wpProjectDoc(workspaceId, proposalDocId) : wpProjectDocs(workspaceId));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDrafting(false);
    }
  };

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    PIPELINE_STAGES.forEach(s => { g[s.id] = []; });
    subs.forEach(s => {
      const stage = s.pipeline_stage || "lead";
      (g[stage] = g[stage] || []).push(s);
    });
    return g;
  }, [subs]);

  const ai = active?.ai_analysis;
  const confidence = computeConfidence(ai);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link to={wp("intake")} className="text-sm text-muted-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> All forms
          </Link>
          <h2 className="text-2xl font-semibold mt-1">Submissions</h2>
        </div>
        <div className="inline-flex rounded-lg border border-border p-0.5">
          <button onClick={() => setView("list")}
            className={`px-3 py-1 text-xs rounded-md ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Inbox</button>
          <button onClick={() => setView("pipeline")}
            className={`px-3 py-1 text-xs rounded-md ${view === "pipeline" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Pipeline</button>
        </div>
      </div>

      {view === "pipeline" ? (
        <div className="overflow-x-auto pb-3">
          <div className="flex gap-3 min-w-max">
            {PIPELINE_STAGES.map(stage => (
              <div key={stage.id} className="w-64 shrink-0">
                <div className={`text-xs font-medium px-3 py-2 rounded-t-lg border ${stage.tone}`}>
                  {stage.label} · <span className="opacity-70">{grouped[stage.id]?.length || 0}</span>
                </div>
                <div className="space-y-2 p-2 bg-muted/20 border border-border border-t-0 rounded-b-lg min-h-[120px]">
                  {(grouped[stage.id] || []).map(s => (
                    <button key={s.id} onClick={() => { setActive(s); setView("list"); }}
                      className="w-full text-left rounded-lg border border-border bg-card p-2.5 hover:border-primary/40 transition">
                      <p className="text-sm font-medium truncate">{s.client_name || "Anonymous"}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{s.client_email || "—"}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                        </span>
                        {s.ai_analysis && <Badge variant="outline" className="text-[9px] py-0 h-4">AI</Badge>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
          <div className="space-y-1.5">
            {subs.length === 0 && <p className="text-sm text-muted-foreground">No submissions yet.</p>}
            {subs.map(s => (
              <button key={s.id} onClick={() => setActive(s)}
                className={`w-full text-left rounded-xl border p-3 transition ${
                  active?.id === s.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                }`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{s.client_name || "Anonymous"}</p>
                  <Badge variant="outline" className={`text-[10px] ${stageMeta(s.pipeline_stage).tone}`}>
                    {stageMeta(s.pipeline_stage).label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{s.client_email || "—"}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                </p>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 min-h-[400px]">
            {!active ? (
              <p className="text-sm text-muted-foreground">Select a submission to view details.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{active.client_name || "Anonymous"}</h3>
                    <p className="text-xs text-muted-foreground">
                      {active.client_email} {active.client_company && `· ${active.client_company}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={analyze} disabled={analyzing}>
                      <Sparkles className="h-3.5 w-3.5 mr-1" />{analyzing ? "Analyzing..." : "AI analyze"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={archive}><Archive className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PIPELINE_STAGES.map(s => (
                    <button key={s.id} onClick={() => setStage(active, s.id)}
                      className={`text-[10px] px-2 py-1 rounded-full border transition ${
                        (active.pipeline_stage || "lead") === s.id
                          ? s.tone
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>

                {ai && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wider text-primary font-medium">AI Analysis</p>
                      <div className={`text-xs font-semibold inline-flex items-center gap-1 ${confidenceTone(confidence)}`}>
                        <ShieldCheck className="h-3.5 w-3.5" /> {confidence}% confidence
                      </div>
                    </div>
                    <p className="text-sm">{ai.summary}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {ai.detected_type && <Badge>Type: {ai.detected_type}</Badge>}
                      {ai.urgency && <Badge variant="secondary">Urgency: {ai.urgency}</Badge>}
                      {ai.scope_clarity && <Badge variant="secondary">Scope: {ai.scope_clarity}</Badge>}
                      {ai.suggested_price_range && <Badge variant="outline">Price: {ai.suggested_price_range}</Badge>}
                    </div>
                    {ai.risks?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1.5 flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Risk signals
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ai.risks.map((r: string, i: number) => (
                            <span key={i}
                              className="text-[10px] px-2 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600">
                              ⚠ {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-xl border border-border p-3 space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Next actions</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <Button size="sm" variant="outline" onClick={convert} disabled={converting} className="justify-start">
                      <Wand2 className="h-3.5 w-3.5 mr-1.5" />{converting ? "Converting..." : "Create Workspace"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={generateProposal} disabled={drafting} className="justify-start">
                      <FileText className="h-3.5 w-3.5 mr-1.5" /> {drafting ? "Drafting..." : "Generate Proposal"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => nav(wp(""))} className="justify-start">
                      <Receipt className="h-3.5 w-3.5 mr-1.5" /> Send Quote
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => nav(wp(""))} className="justify-start">
                      <FileSignature className="h-3.5 w-3.5 mr-1.5" /> Create Agreement
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => nav(wp(""))} className="justify-start">
                      <ListChecks className="h-3.5 w-3.5 mr-1.5" /> Build Checklist
                    </Button>
                    <Button size="sm" variant="outline" onClick={generatePortal} className="justify-start">
                      <Link2 className="h-3.5 w-3.5 mr-1.5" /> {active.portal_token ? "Copy Portal Link" : "Generate Portal"}
                    </Button>
                  </div>
                  {active.portal_token && (
                    <p className="text-[10px] text-muted-foreground break-all">/portal/{active.portal_token}</p>
                  )}
                </div>

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
      )}
    </div>
  );
}