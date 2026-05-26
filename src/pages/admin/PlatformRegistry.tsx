// Admin → Infrastructure → Platform Registry
// Single source of truth for runtime surfaces (DBs, routes, edge functions,
// subdomains). Auto-discovered from src/generated/infra-manifest.json (built
// via predev/prebuild). Live data via platform-registry edge function
// (5-min cached). Admin-gated.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Database, Globe, Network, Activity, ShieldCheck, RefreshCw, ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import manifest from "@/generated/infra-manifest.json";
import { ConnectedDatabasesPanel } from "./ConnectedDatabasesPanel";

type RouteRow = (typeof manifest.routes)[number];

function StatBadge({ ok, label }: { ok: boolean; label: string }) {
  return <Badge variant={ok ? "default" : "destructive"}>{label}</Badge>;
}

function call(action: string, init?: RequestInit & { body?: any }) {
  return supabase.functions.invoke("platform-registry", {
    method: (init?.method as any) || "GET",
    body: init?.body,
    headers: init?.headers as any,
    // @ts-expect-error invoke supports query
    query: { action },
  });
}

async function callViaFetch(action: string, body?: any) {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/platform-registry?action=${action}`;
  const r = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return await r.json();
}

function OverviewTab({ routeCount }: { routeCount: number }) {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => { setBusy(true); try { setData(await callViaFetch("overview")); } finally { setBusy(false); } };
  useEffect(() => { void load(); }, []);
  const fnCount = manifest.edge_functions.length;
  const publicEndpoints = manifest.public_endpoints.length;
  const stats = [
    { k: "Total routes", v: routeCount },
    { k: "Edge functions", v: fnCount },
    { k: "Public endpoints", v: publicEndpoints },
    { k: "Databases", v: data?.db_count ?? "—" },
    { k: "DBs reachable", v: data?.db_reachable ?? "—" },
    { k: "Subdomains online", v: `${data?.subdomains_online ?? "—"}/${data?.subdomains_total ?? "—"}` },
    { k: "Sitemaps OK", v: data?.sitemaps_ok ?? "—" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Manifest generated {new Date(manifest.generated_at).toLocaleString()} · cache 5 min · live probes via platform-registry
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={busy}><RefreshCw className={`w-3 h-3 mr-1 ${busy ? "animate-spin" : ""}`} />Refresh</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {stats.map((s) => (
          <Card key={s.k} className="p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.k}</div>
            <div className="text-2xl font-bold mt-1">{s.v as any}</div>
          </Card>
        ))}
      </div>
      <InfrastructureGraph />
    </div>
  );
}

function InfrastructureGraph() {
  // simple ASCII-style SVG: Frontend → Edge Functions → DBs → Queues → External
  const layers = [
    { name: "Frontend (255 routes)", color: "hsl(var(--primary))" },
    { name: `Edge Functions (${manifest.edge_functions.length})`, color: "hsl(var(--accent))" },
    { name: "Databases (7)", color: "hsl(var(--primary))" },
    { name: "Queues / Workers", color: "hsl(var(--secondary))" },
    { name: "External APIs", color: "hsl(var(--muted-foreground))" },
  ];
  return (
    <Card className="p-6">
      <div className="text-sm font-medium mb-4">Infrastructure Graph</div>
      <div className="flex items-center gap-2 overflow-x-auto">
        {layers.map((l, i) => (
          <div key={l.name} className="flex items-center gap-2">
            <div className="px-4 py-3 rounded-lg border border-border bg-muted/40 text-xs whitespace-nowrap">{l.name}</div>
            {i < layers.length - 1 && <div className="text-muted-foreground">→</div>}
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground mt-3">
        Pull-only flow. PRIMARY auth stays on Lovable Cloud; heavy workloads route to BLOG / WORKSPACE / AI / ADMIN / OWNED DBs (see Connected Databases).
      </div>
    </Card>
  );
}

function RouteRegistryTab() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [probe, setProbe] = useState<Record<string, { status: number; ok: boolean; ms: number }>>({});
  const [busy, setBusy] = useState(false);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return manifest.routes.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (!q) return true;
      return r.path.toLowerCase().includes(q) || (r.authWrapper || "").toLowerCase().includes(q);
    });
  }, [search, typeFilter]);

  const runProbe = async () => {
    setBusy(true);
    try {
      const res = await callViaFetch("routes", { routes: manifest.routes, base: "https://hustlaiapp.in" });
      const map: any = {};
      for (const r of res?.results || []) map[r.path] = r;
      setProbe(map);
    } finally { setBusy(false); }
  };

  const types = ["all", "public", "admin", "auth", "workspace", "docs", "blog", "internal", "redirect"] as const;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Search path or wrapper…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        {types.map((t) => (
          <Button key={t} size="sm" variant={typeFilter === t ? "default" : "outline"} onClick={() => setTypeFilter(t)}>{t}</Button>
        ))}
        <div className="ml-auto" />
        <Button size="sm" onClick={runProbe} disabled={busy}>
          <RefreshCw className={`w-3 h-3 mr-1 ${busy ? "animate-spin" : ""}`} />Probe live (40 sample)
        </Button>
      </div>
      <Card className="overflow-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Path</TableHead><TableHead>Type</TableHead><TableHead>Wrapper</TableHead>
            <TableHead>Source</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.slice(0, 400).map((r: RouteRow) => {
              const p = probe[r.path];
              return (
                <TableRow key={r.path}>
                  <TableCell className="font-mono text-xs">{r.path}</TableCell>
                  <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.authWrapper || "—"}</TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">{r.source}</TableCell>
                  <TableCell>{p ? <Badge variant={p.ok ? "default" : "destructive"}>{p.status} · {p.ms}ms</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      <div className="text-xs text-muted-foreground">Showing {Math.min(filtered.length, 400)} of {filtered.length} routes. Manifest auto-regenerates on dev/build.</div>
    </div>
  );
}

function SubdomainRegistryTab() {
  const [data, setData] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => { setBusy(true); try { const r = await callViaFetch("subdomains"); setData(r.subdomains || []); } finally { setBusy(false); } };
  useEffect(() => { void load(); }, []);
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={load} disabled={busy}><RefreshCw className={`w-3 h-3 mr-1 ${busy ? "animate-spin" : ""}`} />Recheck</Button>
      </div>
      <Card className="overflow-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Host</TableHead><TableHead>Role</TableHead><TableHead>Root</TableHead>
            <TableHead>Sitemap</TableHead><TableHead>Robots</TableHead><TableHead>Links</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(data || []).map((s) => (
              <TableRow key={s.host}>
                <TableCell className="font-mono text-xs">{s.host}</TableCell>
                <TableCell><Badge variant="outline">{s.role}</Badge></TableCell>
                <TableCell><StatBadge ok={s.ssl_ok} label={`${s.root_status || "?"}`} /></TableCell>
                <TableCell><StatBadge ok={s.sitemap_ok} label={s.sitemap_ok ? "OK" : "missing"} /></TableCell>
                <TableCell><StatBadge ok={s.robots_ok} label={s.robots_ok ? "OK" : "missing"} /></TableCell>
                <TableCell className="text-xs space-x-2">
                  <a className="underline" href={s.sitemap_url} target="_blank" rel="noreferrer">sitemap</a>
                  <a className="underline" href={s.robots_url} target="_blank" rel="noreferrer">robots</a>
                </TableCell>
              </TableRow>
            ))}
            {!data && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Probing subdomains…</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function EdgeFunctionsTab() {
  const [search, setSearch] = useState("");
  const filtered = manifest.edge_functions.filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-3">
      <Input placeholder="Search function…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      <Card className="overflow-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Function</TableHead><TableHead>Source</TableHead><TableHead>Endpoint</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((f) => (
              <TableRow key={f.name}>
                <TableCell className="font-mono text-xs">{f.name}</TableCell>
                <TableCell className="text-[10px] text-muted-foreground">{f.source}</TableCell>
                <TableCell className="text-[10px] text-muted-foreground">/functions/v1/{f.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <div className="text-xs text-muted-foreground">{filtered.length} of {manifest.edge_functions.length} edge functions.</div>
    </div>
  );
}

function HealthAuditTab() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => { setBusy(true); try { setData(await callViaFetch("health_audit")); } finally { setBusy(false); } };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">One-click verify: DB reachability, subdomain HTTPS, sitemap + robots presence.</div>
        <Button size="sm" onClick={run} disabled={busy}><Activity className={`w-3 h-3 mr-1 ${busy ? "animate-spin" : ""}`} />Run audit</Button>
      </div>
      {data && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            {data.issues?.length ? <AlertTriangle className="w-4 h-4 text-yellow-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
            <span className="font-medium">{data.issues?.length || 0} issue(s) detected</span>
            <span className="text-xs text-muted-foreground ml-auto">at {new Date(data.generated_at).toLocaleString()}</span>
          </div>
          {data.issues?.length ? (
            <ul className="text-sm space-y-1">
              {data.issues.map((i: any, k: number) => (
                <li key={k}>• <Badge variant="destructive" className="mr-2">{i.kind}</Badge><code className="text-xs">{i.target}</code></li>
              ))}
            </ul>
          ) : <div className="text-sm text-green-600">All systems nominal.</div>}
        </Card>
      )}
    </div>
  );
}

export default function PlatformRegistry() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [params, setParams] = useSearchParams();
  const tab = params.get("sub") || "overview";

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/imskygupta-admin"); return; }
    (async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" as any });
      setIsAdmin(!!data);
      if (!data) navigate("/dashboard");
    })();
  }, [user, loading, navigate]);

  if (loading || isAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/infrastructure")}><ArrowLeft className="w-4 h-4 mr-1" />Infrastructure</Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5" />Platform Registry</h1>
              <p className="text-xs text-muted-foreground">Single source of truth for runtime surfaces — auto-discovered, admin-only, 5-min cached.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={(v) => setParams({ sub: v })}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview"><Activity className="w-3 h-3 mr-1" />Overview</TabsTrigger>
            <TabsTrigger value="databases"><Database className="w-3 h-3 mr-1" />Connected Databases</TabsTrigger>
            <TabsTrigger value="routes"><Network className="w-3 h-3 mr-1" />Route Registry</TabsTrigger>
            <TabsTrigger value="functions"><ExternalLink className="w-3 h-3 mr-1" />Edge Functions</TabsTrigger>
            <TabsTrigger value="subdomains"><Globe className="w-3 h-3 mr-1" />Subdomain Registry</TabsTrigger>
            <TabsTrigger value="audit"><ShieldCheck className="w-3 h-3 mr-1" />Global Health Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4"><OverviewTab routeCount={manifest.routes.length} /></TabsContent>
          <TabsContent value="databases" className="mt-4"><ConnectedDatabasesPanel /></TabsContent>
          <TabsContent value="routes" className="mt-4"><RouteRegistryTab /></TabsContent>
          <TabsContent value="functions" className="mt-4"><EdgeFunctionsTab /></TabsContent>
          <TabsContent value="subdomains" className="mt-4"><SubdomainRegistryTab /></TabsContent>
          <TabsContent value="audit" className="mt-4"><HealthAuditTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}