// Operational control panels for the dependency-reduction phase.
// Mounted as additional tabs in /admin/infrastructure.
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Radar } from "lucide-react";

type Recipient = { id: string; bot: string | null; chat_id: string; label: string | null; role: string | null; routing_role: string; severity_min: string; enabled: boolean; muted_until: string | null; deprecated: boolean };
type Flag = { flag_key: string; enabled: boolean; maintenance: boolean; message: string | null; description: string | null };
type RuntimeRow = { key: string; value: any; scope: string; description: string | null; updated_at: string };
type SecretMeta = { secret_name: string; owner_service: string; location: string; last_rotated_at: string | null; required_by: string[]; notes: string | null };
type Finding = { id: string; kind: string; identifier: string; confidence: number; last_seen_at: string; registered: boolean; notes: string | null };

export function RecipientsPanel() {
  const [rows, setRows] = useState<Recipient[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    const { data } = await supabase.from("ops_telegram_recipients").select("*").order("routing_role");
    setRows((data as any) || []);
    setBusy(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const update = async (id: string, patch: Partial<Recipient>) => {
    await supabase.from("ops_telegram_recipients").update(patch as any).eq("id", id);
    void load();
  };
  const mute = (id: string, mins: number) => update(id, { muted_until: new Date(Date.now() + mins * 60000).toISOString() } as any);
  return (
    <Card className="overflow-auto">
      <div className="p-3 flex justify-between items-center">
        <div className="text-sm text-muted-foreground">Live recipients — DB rows override env <code>TELEGRAM_ADMIN_CHAT_IDS</code> when present.</div>
        <Button size="sm" variant="outline" onClick={load} disabled={busy}><RefreshCw className="h-3 w-3" /></Button>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Label</TableHead><TableHead>Bot</TableHead><TableHead>Chat</TableHead><TableHead>Role</TableHead>
          <TableHead>Sev≥</TableHead><TableHead>Enabled</TableHead><TableHead>Muted</TableHead><TableHead>Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.label || "—"}</TableCell>
              <TableCell><Badge variant="outline">{r.bot || "any"}</Badge></TableCell>
              <TableCell className="font-mono text-xs">{r.chat_id}</TableCell>
              <TableCell><Badge>{r.routing_role}</Badge></TableCell>
              <TableCell className="text-xs">{r.severity_min}</TableCell>
              <TableCell><Switch checked={r.enabled} onCheckedChange={(v) => update(r.id, { enabled: v })} /></TableCell>
              <TableCell className="text-xs">{r.muted_until ? new Date(r.muted_until).toLocaleString() : "—"}</TableCell>
              <TableCell className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => mute(r.id, 60)}>Mute 1h</Button>
                <Button size="sm" variant="outline" onClick={() => update(r.id, { muted_until: null as any })}>Unmute</Button>
                <Button size="sm" variant="ghost" onClick={() => update(r.id, { deprecated: !r.deprecated })}>{r.deprecated ? "Restore" : "Deprecate"}</Button>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No recipients yet — worker still uses env fallback.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}

export function OpsFlagsPanel() {
  const [rows, setRows] = useState<Flag[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("infra_feature_flags").select("*").order("flag_key");
    setRows((data as any) || []);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const update = async (key: string, patch: Partial<Flag>) => {
    await supabase.from("infra_feature_flags").update(patch as any).eq("flag_key", key);
    void load();
  };
  return (
    <Card className="overflow-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Flag</TableHead><TableHead>Enabled</TableHead><TableHead>Maintenance</TableHead><TableHead>Message</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((f) => (
            <TableRow key={f.flag_key}>
              <TableCell className="font-mono text-xs">{f.flag_key}</TableCell>
              <TableCell><Switch checked={f.enabled} onCheckedChange={(v) => update(f.flag_key, { enabled: v })} /></TableCell>
              <TableCell><Switch checked={f.maintenance} onCheckedChange={(v) => update(f.flag_key, { maintenance: v })} /></TableCell>
              <TableCell className="text-xs text-muted-foreground">{f.message || "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{f.description || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function RuntimeConfigPanel() {
  const [rows, setRows] = useState<RuntimeRow[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    const { data } = await supabase.from("infra_runtime_config").select("*").order("key");
    setRows((data as any) || []);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const save = async (key: string) => {
    try {
      const v = JSON.parse(edits[key]);
      await supabase.from("infra_runtime_config").update({ value: v } as any).eq("key", key);
      setEdits((e) => { const n = { ...e }; delete n[key]; return n; });
      void load();
    } catch { alert("Invalid JSON"); }
  };
  return (
    <Card className="overflow-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Key</TableHead><TableHead>Scope</TableHead><TableHead>Value (JSON)</TableHead><TableHead>Description</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.key}>
              <TableCell className="font-mono text-xs">{r.key}</TableCell>
              <TableCell><Badge variant="outline">{r.scope}</Badge></TableCell>
              <TableCell>
                <Input value={edits[r.key] ?? JSON.stringify(r.value)} onChange={(e) => setEdits((s) => ({ ...s, [r.key]: e.target.value }))} className="font-mono text-xs" />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{r.description || "—"}</TableCell>
              <TableCell>
                <Button size="sm" disabled={edits[r.key] === undefined} onClick={() => save(r.key)}>Save</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function SecretsInventoryPanel() {
  const [rows, setRows] = useState<SecretMeta[]>([]);
  useEffect(() => {
    void supabase.from("infra_service_secrets_meta").select("*").order("owner_service").then(({ data }) => setRows((data as any) || []));
  }, []);
  return (
    <Card className="overflow-auto">
      <div className="p-3 text-xs text-muted-foreground">Metadata only — raw secret values are never stored in DB.</div>
      <Table>
        <TableHeader><TableRow><TableHead>Secret</TableHead><TableHead>Owner</TableHead><TableHead>Location</TableHead><TableHead>Last rotated</TableHead><TableHead>Required by</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((s) => {
            const stale = !s.last_rotated_at || Date.now() - new Date(s.last_rotated_at).getTime() > 180 * 86400000;
            return (
              <TableRow key={s.secret_name}>
                <TableCell className="font-mono text-xs">{s.secret_name}</TableCell>
                <TableCell><Badge variant="outline">{s.owner_service}</Badge></TableCell>
                <TableCell className="text-xs">{s.location}</TableCell>
                <TableCell className="text-xs">{s.last_rotated_at ? new Date(s.last_rotated_at).toLocaleDateString() : <Badge variant={stale ? "destructive" : "outline"}>never</Badge>}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{(s.required_by || []).join(", ")}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs">{s.notes}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

export function DiscoveryPanel() {
  const [rows, setRows] = useState<Finding[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase.from("infra_discovery_findings").select("*").order("last_seen_at", { ascending: false });
    setRows((data as any) || []);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const scan = async () => {
    setBusy(true);
    try {
      await supabase.functions.invoke("infra-discovery-scan");
      await load();
    } finally { setBusy(false); }
  };
  const markRegistered = async (id: string) => {
    await supabase.from("infra_discovery_findings").update({ registered: true } as any).eq("id", id);
    void load();
  };
  return (
    <Card className="overflow-auto">
      <div className="p-3 flex justify-between items-center">
        <div className="text-sm text-muted-foreground">Auto-discovered infra signals awaiting operator review.</div>
        <Button size="sm" onClick={scan} disabled={busy}><Radar className="h-3 w-3 mr-1" />Scan now</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Kind</TableHead><TableHead>Identifier</TableHead><TableHead>Confidence</TableHead><TableHead>Last seen</TableHead><TableHead>Notes</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((f) => (
            <TableRow key={f.id} className={f.registered ? "opacity-50" : ""}>
              <TableCell><Badge variant="outline">{f.kind}</Badge></TableCell>
              <TableCell className="font-mono text-xs">{f.identifier}</TableCell>
              <TableCell>{f.confidence}%</TableCell>
              <TableCell className="text-xs">{new Date(f.last_seen_at).toLocaleString()}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{f.notes}</TableCell>
              <TableCell>{!f.registered && <Button size="sm" variant="outline" onClick={() => markRegistered(f.id)}>Acknowledge</Button>}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No findings yet — click "Scan now".</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}