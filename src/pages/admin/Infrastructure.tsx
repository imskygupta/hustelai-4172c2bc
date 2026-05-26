import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Database, Network, Activity, Send, Train, Shield, AlertTriangle, Users, Flag, Settings, KeyRound, Radar, Gauge, Newspaper, Lock, Flame, BarChart3, TrendingUp, Target, Wifi, ArrowRightLeft, Bot, GitBranch, Bomb, Link2, Crosshair, Sparkles, AlertOctagon, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { RecipientsPanel, OpsFlagsPanel, RuntimeConfigPanel, SecretsInventoryPanel, DiscoveryPanel } from "./InfrastructureControl";
import { TelemetryPlanePanel, BlogAutomationPanel } from "./TelemetryPanels";
import { ExecutionAuthorityPanel } from "./ExecutionAuthorityPanel";
import { DBHeatmapPanel, QueryPressurePanel, GrowthTrendsPanel, ExtractionCandidatesPanel, RealtimeLoadPanel } from "./DBHeatmapPanels";
import { TelemetryEvacuationPanel } from "./TelemetryEvacuationPanel";
import { AutonomousControllerPanel } from "./AutonomousControllerPanel";
import { TopologyGraphPanel, BlastRadiusPanel, FailureSimulationPanel, CouplingFindingsPanel, ExtractionForecastPanel, StabilityScorePanel } from "./TopologyPanels";
import { ProductionIncidentsPanel } from "./ProductionStabilityPanels";
import { RuntimeExtractionPanel } from "./RuntimeExtractionPanel";
import { PrimaryDetoxStatusPanel } from "./PrimaryDetoxStatus";
import { BoundaryMapPanel } from "./BoundaryMapPanel";
import { PlatformHardeningPanel } from "./PlatformHardeningPanel";
import { ConnectedDatabasesPanel } from "./ConnectedDatabasesPanel";
import { failOpen, INFRA_SAFE_MODE, retryWithTimeout } from "@/lib/async/timeout";

type Project = {
  id: string; name: string; purpose: string; environment: string; project_ref: string; project_url: string | null;
  owner_category: string; criticality: string; migration_state: string; failover_notes: string | null;
  connected_domains: string[]; connected_modules: string[];
  tables_count: number | null; edge_functions_count: number | null;
  last_db_activity_at: string | null; last_function_call_at: string | null;
  est_daily_writes: number | null; est_storage_mb: number | null;
  lovable_dependency_score: number | null; extraction_readiness: number | null;
  safe_to_isolate: boolean | null; risk_if_primary_dies: string | null;
  notes: string | null; is_active: boolean;
};
type Dep = { id: string; source_type: string; source_name: string; target_project_ref: string; target_kind: string; notes: string | null };
type Health = { id: string; project_ref: string; reachable: boolean | null; paused: boolean | null; auth_healthy: boolean | null; functions_responding: boolean | null; last_cron_at: string | null; last_write_at: string | null; latency_ms: number | null; recent_errors: any; sampled_at: string };
type Tg = { id: string; bot_label: string; bot_username: string | null; worker_owner: string | null; webhook_target: string | null; routing_role: string; chat_ids: string[]; last_message_at: string | null; delivery_success_pct_24h: number | null; env_dependencies: string[]; notes: string | null; is_active: boolean };
type Rail = { id: string; service_name: string; purpose: string; domain: string | null; health_url: string | null; uptime_pct: number | null; status: string | null; active_workers: number | null; restart_count: number | null; env_dependencies: string[]; last_seen_at: string | null; notes: string | null };

const ownerColor: Record<string, string> = {
  "lovable-owned": "destructive", "hustle-owned": "default", "isolated-module": "secondary", "deprecated": "outline",
};
const critColor: Record<string, string> = {
  critical: "destructive", operational: "default", optional: "secondary", experimental: "outline",
};

function fmt(ts: string | null) { return ts ? new Date(ts).toLocaleString() : "—"; }

export default function Infrastructure() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deps, setDeps] = useState<Dep[]>([]);
  const [health, setHealth] = useState<Health[]>([]);
  const [tg, setTg] = useState<Tg[]>([]);
  const [rail, setRail] = useState<Rail[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [probeResult, setProbeResult] = useState<any>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/imskygupta-admin"); return; }
    (async () => {
      const { data } = await failOpen(
        () => retryWithTimeout(
          () => supabase.from("user_roles").select("role").eq("user_id", user.id),
          "infrastructure.roleCheck",
        ),
        { data: [] } as any,
        "infrastructure.roleCheck",
      );
      const admin = (data || []).some((r) => r.role === "admin");
      setIsAdmin(admin);
      if (!admin) navigate("/imskygupta-admin");
    })();
  }, [user, loading, navigate]);

  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const q = (label: string, run: () => Promise<any> | PromiseLike<any>) =>
        failOpen(() => retryWithTimeout(run, label), { data: [] } as any, label);
      const [p, d, h, t, r] = await Promise.all([
        q("infrastructure.projects", () => supabase.from("infra_supabase_projects").select("*").order("criticality").order("name")),
        q("infrastructure.dependencies", () => supabase.from("infra_dependencies").select("*").order("source_type").order("source_name")),
        q("infrastructure.health", () => supabase.from("infra_runtime_health").select("*").order("sampled_at", { ascending: false }).limit(200)),
        q("infrastructure.telegram", () => supabase.from("infra_telegram_registry").select("*").order("routing_role")),
        q("infrastructure.railway", () => supabase.from("infra_railway_services").select("*").order("service_name")),
      ]);
      if (p.error) throw p.error;
      setProjects((p.data as any) || []);
      setDeps((d.data as any) || []);
      setHealth((h.data as any) || []);
      setTg((t.data as any) || []);
      setRail((r.data as any) || []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally { setBusy(false); }
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const probe = useCallback(async () => {
    if (INFRA_SAFE_MODE) {
      setProbeResult({ skipped: true, reason: "Infra safe mode enabled" });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await failOpen(
        () => retryWithTimeout(() => supabase.functions.invoke("infrastructure-probe"), "infrastructure.probe"),
        { data: { degraded: true }, error: null } as any,
        "infrastructure.probe",
      );
      if (error) throw error;
      setProbeResult(data);
      await load();
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setBusy(false); }
  }, [load]);

  const latestByProject = useMemo(() => {
    const m = new Map<string, Health>();
    for (const h of health) if (!m.has(h.project_ref)) m.set(h.project_ref, h);
    return m;
  }, [health]);

  const filteredDeps = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return deps;
    return deps.filter((d) =>
      d.source_name.toLowerCase().includes(q) ||
      d.target_project_ref.toLowerCase().includes(q) ||
      d.source_type.toLowerCase().includes(q),
    );
  }, [deps, search]);

  const depsByTarget = useMemo(() => {
    const m = new Map<string, Dep[]>();
    for (const d of deps) {
      const arr = m.get(d.target_project_ref) || [];
      arr.push(d); m.set(d.target_project_ref, arr);
    }
    return m;
  }, [deps]);

  const warnings = useMemo(() => {
    const out: { kind: string; message: string }[] = [];
    const now = Date.now();
    for (const p of projects) {
      const h = latestByProject.get(p.project_ref);
      if (p.is_active && h && h.reachable === false) out.push({ kind: "unreachable", message: `${p.name} unreachable` });
      const lastAct = p.last_db_activity_at ? new Date(p.last_db_activity_at).getTime() : null;
      if (lastAct && now - lastAct > 7 * 24 * 3600 * 1000) out.push({ kind: "inactive", message: `${p.name} inactive >7d` });
    }
    return out;
  }, [projects, latestByProject]);

  if (loading || isAdmin === null) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/runtime")}><ArrowLeft className="h-4 w-4 mr-1" />Runtime</Button>
            <h1 className="text-xl font-semibold">Infrastructure Control Plane</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={busy}><RefreshCw className={`h-4 w-4 mr-1 ${busy ? "animate-spin" : ""}`} />Reload</Button>
            <Button size="sm" onClick={probe} disabled={busy}>Run probe</Button>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {INFRA_SAFE_MODE && (
          <Card className="p-4 border-yellow-500/40 bg-yellow-500/5 text-sm text-muted-foreground">
            Emergency infra safe mode is enabled. Phase 9 tabs, drift polling, detox polling, realtime probes, and backup monitor polling are paused.
          </Card>
        )}
        {error && <Card className="p-4 border-destructive text-destructive">{error}</Card>}
        {warnings.length > 0 && (
          <Card className="p-4 border-yellow-500/40 bg-yellow-500/5">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /><span className="font-medium">Warnings</span></div>
            <ul className="text-sm space-y-1">{warnings.map((w, i) => <li key={i}>• [{w.kind}] {w.message}</li>)}</ul>
          </Card>
        )}

        <Tabs defaultValue="registry">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="registry"><Database className="h-4 w-4 mr-1" />Supabase Registry</TabsTrigger>
            <TabsTrigger value="connected"><Database className="h-4 w-4 mr-1" />Connected Databases</TabsTrigger>
            <TabsTrigger value="deps"><Network className="h-4 w-4 mr-1" />Dependencies</TabsTrigger>
            <TabsTrigger value="health"><Activity className="h-4 w-4 mr-1" />Runtime Health</TabsTrigger>
            <TabsTrigger value="telegram"><Send className="h-4 w-4 mr-1" />Telegram</TabsTrigger>
            <TabsTrigger value="railway"><Train className="h-4 w-4 mr-1" />Railway</TabsTrigger>
            <TabsTrigger value="extraction"><Shield className="h-4 w-4 mr-1" />Extraction Readiness</TabsTrigger>
            <TabsTrigger value="recipients"><Users className="h-4 w-4 mr-1" />Recipients</TabsTrigger>
            <TabsTrigger value="opsflags"><Flag className="h-4 w-4 mr-1" />Ops Flags</TabsTrigger>
            <TabsTrigger value="runtime"><Settings className="h-4 w-4 mr-1" />Runtime Config</TabsTrigger>
            <TabsTrigger value="secrets"><KeyRound className="h-4 w-4 mr-1" />Secrets</TabsTrigger>
            <TabsTrigger value="discovery"><Radar className="h-4 w-4 mr-1" />Discovery</TabsTrigger>
            <TabsTrigger value="telemetry"><Gauge className="h-4 w-4 mr-1" />Telemetry Plane</TabsTrigger>
            <TabsTrigger value="blog"><Newspaper className="h-4 w-4 mr-1" />Blog Automation</TabsTrigger>
            <TabsTrigger value="authority"><Lock className="h-4 w-4 mr-1" />Execution Authority</TabsTrigger>
            <TabsTrigger value="heatmap"><Flame className="h-4 w-4 mr-1" />DB Heatmap</TabsTrigger>
            <TabsTrigger value="pressure"><BarChart3 className="h-4 w-4 mr-1" />Query Pressure</TabsTrigger>
            <TabsTrigger value="growth"><TrendingUp className="h-4 w-4 mr-1" />Growth Trends</TabsTrigger>
            <TabsTrigger value="candidates"><Target className="h-4 w-4 mr-1" />Extraction Candidates</TabsTrigger>
            {!INFRA_SAFE_MODE && <TabsTrigger value="rtload"><Wifi className="h-4 w-4 mr-1" />Realtime Load</TabsTrigger>}
            <TabsTrigger value="evacuation"><ArrowRightLeft className="h-4 w-4 mr-1" />Telemetry Evacuation</TabsTrigger>
            <TabsTrigger value="autopilot"><Bot className="h-4 w-4 mr-1" />Autonomous Controller</TabsTrigger>
            <TabsTrigger value="topology"><GitBranch className="h-4 w-4 mr-1" />Runtime Topology</TabsTrigger>
            <TabsTrigger value="blast"><Bomb className="h-4 w-4 mr-1" />Blast Radius</TabsTrigger>
            <TabsTrigger value="simulate"><Crosshair className="h-4 w-4 mr-1" />Failure Simulation</TabsTrigger>
            <TabsTrigger value="coupling"><Link2 className="h-4 w-4 mr-1" />Coupling</TabsTrigger>
            <TabsTrigger value="forecast"><Target className="h-4 w-4 mr-1" />Extraction Forecast</TabsTrigger>
            <TabsTrigger value="stability"><Sparkles className="h-4 w-4 mr-1" />Stability Score</TabsTrigger>
            <TabsTrigger value="noc"><AlertOctagon className="h-4 w-4 mr-1" />Production NOC</TabsTrigger>
            <TabsTrigger value="wave1"><Waves className="h-4 w-4 mr-1" />Runtime Extraction</TabsTrigger>
            {!INFRA_SAFE_MODE && <TabsTrigger value="detox"><Shield className="h-4 w-4 mr-1" />Primary Detox</TabsTrigger>}
            {!INFRA_SAFE_MODE && <TabsTrigger value="boundary"><Lock className="h-4 w-4 mr-1" />Boundary Map</TabsTrigger>}
            {!INFRA_SAFE_MODE && <TabsTrigger value="hardening"><Sparkles className="h-4 w-4 mr-1" />Phase 9 Hardening</TabsTrigger>}
          </TabsList>

          <TabsContent value="registry">
            <Card className="overflow-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Ref</TableHead><TableHead>Owner</TableHead>
                  <TableHead>Criticality</TableHead><TableHead>Migration</TableHead>
                  <TableHead>Modules</TableHead><TableHead>Reachable</TableHead><TableHead>Purpose</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {projects.map((p) => {
                    const h = latestByProject.get(p.project_ref);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell><code className="text-xs">{p.project_ref}</code></TableCell>
                        <TableCell><Badge variant={ownerColor[p.owner_category] as any}>{p.owner_category}</Badge></TableCell>
                        <TableCell><Badge variant={critColor[p.criticality] as any}>{p.criticality}</Badge></TableCell>
                        <TableCell className="text-xs">{p.migration_state}</TableCell>
                        <TableCell className="text-xs">{p.connected_modules.join(", ")}</TableCell>
                        <TableCell>{h ? (h.reachable ? <Badge variant="default">up</Badge> : <Badge variant="destructive">down</Badge>) : <Badge variant="outline">—</Badge>}</TableCell>
                        <TableCell className="text-xs max-w-md text-muted-foreground">{p.purpose}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="connected">
            <ConnectedDatabasesPanel />
          </TabsContent>

          <TabsContent value="deps" className="space-y-4">
            <Input placeholder="Search source/target…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
            {/* connected-databases panel rendered above via dedicated tab */}
            <Card className="overflow-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Source type</TableHead><TableHead>Source</TableHead>
                  <TableHead>Target ref</TableHead><TableHead>Kind</TableHead><TableHead>Notes</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredDeps.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell><Badge variant="outline">{d.source_type}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{d.source_name}</TableCell>
                      <TableCell className="font-mono text-xs">{d.target_project_ref}</TableCell>
                      <TableCell><Badge variant="secondary">{d.target_kind}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from(depsByTarget.entries()).map(([ref, ds]) => (
                <Card key={ref} className="p-4">
                  <div className="font-medium mb-2 font-mono text-xs">{ref}</div>
                  <div className="text-xs text-muted-foreground mb-2">{ds.length} dependents</div>
                  <ul className="text-xs space-y-1">
                    {ds.map((d) => <li key={d.id}>• <span className="text-muted-foreground">{d.source_type}</span> {d.source_name}</li>)}
                  </ul>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="health">
            <Card className="overflow-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Project</TableHead><TableHead>Reachable</TableHead><TableHead>Latency</TableHead>
                  <TableHead>Last write</TableHead><TableHead>Last cron</TableHead><TableHead>Sampled</TableHead><TableHead>Errors</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {projects.map((p) => {
                    const h = latestByProject.get(p.project_ref);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{h ? (h.reachable ? <Badge>up</Badge> : <Badge variant="destructive">down</Badge>) : "—"}</TableCell>
                        <TableCell className="text-xs">{h?.latency_ms ?? "—"} ms</TableCell>
                        <TableCell className="text-xs">{fmt(h?.last_write_at ?? null)}</TableCell>
                        <TableCell className="text-xs">{fmt(h?.last_cron_at ?? null)}</TableCell>
                        <TableCell className="text-xs">{fmt(h?.sampled_at ?? null)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{h?.recent_errors ? JSON.stringify(h.recent_errors) : ""}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
            {probeResult && (
              <Card className="p-4 mt-4">
                <div className="font-medium mb-2">Last probe</div>
                <pre className="text-xs overflow-auto">{JSON.stringify(probeResult, null, 2)}</pre>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="telegram">
            <Card className="overflow-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Bot</TableHead><TableHead>Username</TableHead><TableHead>Role</TableHead>
                  <TableHead>Worker</TableHead><TableHead>Webhook</TableHead><TableHead>Chats</TableHead>
                  <TableHead>Delivery 24h</TableHead><TableHead>Env</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {tg.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.bot_label}</TableCell>
                      <TableCell className="text-xs">@{t.bot_username || "—"}</TableCell>
                      <TableCell><Badge variant={t.routing_role === "deprecated" ? "outline" : "default"}>{t.routing_role}</Badge></TableCell>
                      <TableCell className="text-xs">{t.worker_owner || "—"}</TableCell>
                      <TableCell className="text-xs">{t.webhook_target || "—"}</TableCell>
                      <TableCell className="text-xs">{t.chat_ids.length}</TableCell>
                      <TableCell className="text-xs">{t.delivery_success_pct_24h ?? "—"}%</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.env_dependencies.join(", ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <Card className="p-4 mt-4 border-yellow-500/40 bg-yellow-500/5 text-sm">
              <div className="font-medium mb-1">Routing prep</div>
              Admin chat IDs are still sourced from <code>TELEGRAM_ADMIN_CHAT_IDS</code> on Railway. The new <code>ops_telegram_recipients</code> table is created but not yet consumed by the worker — reserved for future DB-backed cutover.
            </Card>
          </TabsContent>

          <TabsContent value="railway">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rail.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{r.service_name}</div>
                    <Badge variant={r.status === "healthy" ? "default" : r.status === "unreachable" ? "destructive" : "outline"}>{r.status || "unknown"}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">{r.purpose}</div>
                  <div className="text-xs space-y-1">
                    <div>Domain: {r.domain || "—"}</div>
                    <div>Health: <code>{r.health_url}</code></div>
                    <div>Last seen: {fmt(r.last_seen_at)}</div>
                    <div>Restarts: {r.restart_count ?? 0}</div>
                    <div>Env: <span className="text-muted-foreground">{r.env_dependencies.join(", ")}</span></div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="extraction">
            <Card className="overflow-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Project</TableHead><TableHead>Lovable dep</TableHead>
                  <TableHead>Extraction readiness</TableHead><TableHead>Safe to isolate</TableHead>
                  <TableHead>Risk if primary dies</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {[...projects].sort((a, b) => (b.extraction_readiness ?? 0) - (a.extraction_readiness ?? 0)).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><Badge variant={(p.lovable_dependency_score ?? 0) > 70 ? "destructive" : "secondary"}>{p.lovable_dependency_score ?? "—"}</Badge></TableCell>
                      <TableCell><Badge variant={(p.extraction_readiness ?? 0) > 70 ? "default" : "outline"}>{p.extraction_readiness ?? "—"}</Badge></TableCell>
                      <TableCell>{p.safe_to_isolate ? <Badge>yes</Badge> : <Badge variant="outline">no</Badge>}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-md">{p.risk_if_primary_dies}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="recipients"><RecipientsPanel /></TabsContent>
          <TabsContent value="opsflags"><OpsFlagsPanel /></TabsContent>
          <TabsContent value="runtime"><RuntimeConfigPanel /></TabsContent>
          <TabsContent value="secrets"><SecretsInventoryPanel /></TabsContent>
          <TabsContent value="discovery"><DiscoveryPanel /></TabsContent>
          <TabsContent value="telemetry"><TelemetryPlanePanel /></TabsContent>
          <TabsContent value="blog"><BlogAutomationPanel /></TabsContent>
          <TabsContent value="authority"><ExecutionAuthorityPanel /></TabsContent>
          <TabsContent value="heatmap"><DBHeatmapPanel /></TabsContent>
          <TabsContent value="pressure"><QueryPressurePanel /></TabsContent>
          <TabsContent value="growth"><GrowthTrendsPanel /></TabsContent>
          <TabsContent value="candidates"><ExtractionCandidatesPanel /></TabsContent>
          {!INFRA_SAFE_MODE && <TabsContent value="rtload"><RealtimeLoadPanel /></TabsContent>}
          <TabsContent value="evacuation"><TelemetryEvacuationPanel /></TabsContent>
          <TabsContent value="autopilot"><AutonomousControllerPanel /></TabsContent>
          <TabsContent value="topology"><TopologyGraphPanel /></TabsContent>
          <TabsContent value="blast"><BlastRadiusPanel /></TabsContent>
          <TabsContent value="simulate"><FailureSimulationPanel /></TabsContent>
          <TabsContent value="coupling"><CouplingFindingsPanel /></TabsContent>
          <TabsContent value="forecast"><ExtractionForecastPanel /></TabsContent>
          <TabsContent value="stability"><StabilityScorePanel /></TabsContent>
          <TabsContent value="noc"><ProductionIncidentsPanel /></TabsContent>
          <TabsContent value="wave1"><RuntimeExtractionPanel /></TabsContent>
          {!INFRA_SAFE_MODE && <TabsContent value="detox"><PrimaryDetoxStatusPanel /></TabsContent>}
          {!INFRA_SAFE_MODE && <TabsContent value="boundary"><BoundaryMapPanel /></TabsContent>}
          {!INFRA_SAFE_MODE && <TabsContent value="hardening"><PlatformHardeningPanel /></TabsContent>}
        </Tabs>
      </div>
    </div>
  );
}