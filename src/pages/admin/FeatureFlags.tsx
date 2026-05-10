import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flag, RefreshCw, Search, ShieldAlert, Wrench, Power, History, Users, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { clearFlagCache, resolveFlags } from "@/lib/flags";

type Flag = {
  id: string;
  feature_key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  environments: string[];
  allowed_tiers: string[];
  beta_only: boolean;
  admin_only: boolean;
  maintenance: boolean;
  kill_switch: boolean;
  maintenance_message: string | null;
  expires_at: string | null;
  category: string;
  owner: string | null;
  min_tier: string | null;
};

type Group = { id: string; key: string; label: string; description: string | null };
type Override = { id: string; flag_key: string; user_id: string | null; group_id: string | null; enabled: boolean; reason: string | null; expires_at: string | null; created_at: string };
type Audit = { id: string; flag_key: string; action: string; actor_id: string | null; before: any; after: any; created_at: string };

const ALL_TIERS = ["free", "pro", "elite", "infinity"] as const;
const ALL_ENVS  = ["production", "preview", "development"] as const;

export default function AdminFeatureFlags() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [flags, setFlags] = useState<Flag[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [q, setQ] = useState("");
  const [envFilter, setEnvFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Flag | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/imskygupta-admin"); return; }
    (async () => {
      const { data } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
      if (!data) navigate("/");
    })();
  }, [user, loading, navigate]);

  const refresh = async () => {
    const [f, g, o, a] = await Promise.all([
      (supabase as any).from("feature_flags").select("*").order("category").order("feature_key"),
      (supabase as any).from("rollout_groups").select("*").order("key"),
      (supabase as any).from("feature_flag_overrides").select("*").order("created_at", { ascending: false }).limit(100),
      (supabase as any).from("feature_audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setFlags((f.data as Flag[]) || []);
    setGroups((g.data as Group[]) || []);
    setOverrides((o.data as Override[]) || []);
    setAudit((a.data as Audit[]) || []);
  };
  useEffect(() => { if (isAdmin) refresh(); /* eslint-disable-next-line */ }, [isAdmin]);

  const filtered = useMemo(() => {
    return flags.filter(f => {
      if (q && !f.feature_key.toLowerCase().includes(q.toLowerCase()) &&
          !f.label.toLowerCase().includes(q.toLowerCase())) return false;
      if (envFilter !== "all" && !f.environments.includes(envFilter)) return false;
      if (tierFilter !== "all" && f.allowed_tiers.length > 0 && !f.allowed_tiers.includes(tierFilter)) return false;
      return true;
    });
  }, [flags, q, envFilter, tierFilter]);

  const persist = async (id: string, patch: Partial<Flag>) => {
    setBusy(id);
    try {
      const { error } = await (supabase as any).from("feature_flags")
        .update({ ...patch, last_modified_by: user?.id }).eq("id", id);
      if (error) throw error;
      clearFlagCache(); resolveFlags(true);
      await refresh();
      toast({ title: "Flag updated" });
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally { setBusy(null); }
  };

  const removeOverride = async (id: string) => {
    await (supabase as any).from("feature_flag_overrides").delete().eq("id", id);
    clearFlagCache(); refresh();
  };

  if (loading || isAdmin === null) {
    return <div className="min-h-screen bg-[#07090d] grid place-items-center text-zinc-500 text-sm">Loading…</div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#07090d] text-zinc-200">
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="h-7 w-7 rounded-md bg-violet-500/15 ring-1 ring-violet-500/30 grid place-items-center">
              <Flag className="h-3.5 w-3.5 text-violet-400" />
            </span>
            Feature Flag Control Center
          </div>
          <Button size="sm" variant="outline" onClick={refresh} className="border-white/10 text-zinc-300">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Tabs defaultValue="flags" className="space-y-6">
          <TabsList className="bg-white/[0.04] border border-white/[0.06]">
            <TabsTrigger value="flags">Flags</TabsTrigger>
            <TabsTrigger value="overrides">Overrides</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>

          {/* FLAGS */}
          <TabsContent value="flags" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input placeholder="Search flags…" value={q} onChange={e => setQ(e.target.value)}
                  className="pl-9 bg-white/[0.02] border-white/10" />
              </div>
              <select value={envFilter} onChange={e => setEnvFilter(e.target.value)}
                className="bg-white/[0.02] border border-white/10 rounded-md px-3 py-2 text-sm">
                <option value="all">All envs</option>
                {ALL_ENVS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <select value={tierFilter} onChange={e => setTierFilter(e.target.value)}
                className="bg-white/[0.02] border border-white/10 rounded-md px-3 py-2 text-sm">
                <option value="all">All tiers</option>
                {ALL_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="grid gap-3">
              {filtered.map(f => (
                <FlagCard key={f.id} flag={f} busy={busy === f.id}
                  onSave={(patch) => persist(f.id, patch)}
                  onSelect={() => setSelected(f)} groups={groups} />
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-12 text-zinc-500 text-sm border border-dashed border-white/10 rounded-xl">
                  No flags match the current filters.
                </div>
              )}
            </div>
          </TabsContent>

          {/* OVERRIDES */}
          <TabsContent value="overrides">
            <OverridesPanel overrides={overrides} groups={groups} flags={flags}
              onRemove={removeOverride} onChanged={refresh} userId={user?.id || null} />
          </TabsContent>

          {/* GROUPS */}
          <TabsContent value="groups">
            <GroupsPanel groups={groups} onChanged={refresh} />
          </TabsContent>

          {/* AUDIT */}
          <TabsContent value="audit">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.015] divide-y divide-white/[0.05]">
              {audit.map(row => (
                <div key={row.id} className="px-4 py-3 text-xs flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-white/15 text-zinc-300 uppercase">{row.action}</Badge>
                      <code className="text-zinc-200">{row.flag_key}</code>
                    </div>
                    <div className="text-zinc-500 mt-1 truncate">
                      {row.actor_id ? `by ${row.actor_id.slice(0, 8)}…` : "system"} · {new Date(row.created_at).toLocaleString()}
                    </div>
                  </div>
                  <History className="h-4 w-4 text-zinc-600 shrink-0" />
                </div>
              ))}
              {audit.length === 0 && <div className="px-4 py-8 text-center text-zinc-500 text-sm">No changes yet.</div>}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function FlagCard({ flag, busy, onSave, groups }: {
  flag: Flag; busy: boolean;
  onSave: (patch: Partial<Flag>) => void;
  onSelect: () => void;
  groups: Group[];
}) {
  const [pct, setPct] = useState(flag.rollout_percentage);
  useEffect(() => { setPct(flag.rollout_percentage); }, [flag.rollout_percentage]);

  const toggleTier = (t: string) => {
    const set = new Set(flag.allowed_tiers);
    set.has(t) ? set.delete(t) : set.add(t);
    onSave({ allowed_tiers: [...set] });
  };

  return (
    <div className={`rounded-xl border bg-white/[0.02] p-4 transition ${
      flag.kill_switch ? "border-red-500/40" :
      flag.maintenance ? "border-amber-500/40" :
      "border-white/[0.08]"
    }`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{flag.label}</span>
            <code className="text-[11px] text-zinc-500">{flag.feature_key}</code>
            <Badge variant="outline" className="text-[10px] border-white/10 text-zinc-400">{flag.category}</Badge>
            {flag.kill_switch && <Badge className="bg-red-500/15 text-red-300 border-red-400/30">KILLED</Badge>}
            {flag.maintenance && <Badge className="bg-amber-500/15 text-amber-300 border-amber-400/30">MAINTENANCE</Badge>}
            {flag.beta_only && <Badge className="bg-violet-500/15 text-violet-300 border-violet-400/30">BETA</Badge>}
            {flag.admin_only && <Badge className="bg-sky-500/15 text-sky-300 border-sky-400/30">ADMIN</Badge>}
          </div>
          {flag.description && <p className="text-xs text-zinc-500 mt-1">{flag.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Enabled</span>
          <Switch checked={flag.enabled} disabled={busy}
            onCheckedChange={(v) => onSave({ enabled: v })} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rollout */}
        <div>
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
            <span>Rollout</span>
            <span className="text-zinc-300 font-mono">{pct}%</span>
          </div>
          <Slider value={[pct]} onValueChange={(v) => setPct(v[0])}
            onValueCommit={(v) => onSave({ rollout_percentage: v[0] })}
            min={0} max={100} step={1} disabled={busy} />
          <div className="flex gap-1 mt-2 flex-wrap">
            {[1, 5, 10, 25, 50, 100].map(n => (
              <button key={n} onClick={() => { setPct(n); onSave({ rollout_percentage: n }); }}
                className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400">
                {n}%
              </button>
            ))}
          </div>
        </div>

        {/* Tiers */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Allowed tiers (empty = all)</div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_TIERS.map(t => {
              const on = flag.allowed_tiers.includes(t);
              return (
                <button key={t} onClick={() => toggleTier(t)} disabled={busy}
                  className={`text-xs px-2.5 py-1 rounded-md border transition ${
                    on ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-300"
                       : "bg-white/[0.02] border-white/10 text-zinc-500 hover:text-zinc-300"
                  }`}>{t}</button>
              );
            })}
          </div>
        </div>

        {/* Operational toggles */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Operational</div>
          <div className="space-y-1.5">
            <Toggle label="Maintenance" checked={flag.maintenance} icon={Wrench}
              onChange={(v) => onSave({ maintenance: v })} />
            <Toggle label="Kill switch" checked={flag.kill_switch} icon={Power} danger
              onChange={(v) => onSave({ kill_switch: v })} />
            <Toggle label="Beta only" checked={flag.beta_only} icon={Users}
              onChange={(v) => onSave({ beta_only: v })} />
            <Toggle label="Admin only" checked={flag.admin_only} icon={ShieldAlert}
              onChange={(v) => onSave({ admin_only: v })} />
          </div>
        </div>
      </div>

      {flag.maintenance && (
        <div className="mt-3">
          <Input
            defaultValue={flag.maintenance_message || ""}
            placeholder="Maintenance message shown to users…"
            onBlur={(e) => {
              if (e.target.value !== (flag.maintenance_message || ""))
                onSave({ maintenance_message: e.target.value });
            }}
            className="bg-black/30 border-white/10 text-sm" />
        </div>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange, icon: Icon, danger }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
  icon: any; danger?: boolean;
}) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs border transition ${
        checked
          ? danger ? "bg-red-500/10 border-red-400/30 text-red-300"
                  : "bg-emerald-500/10 border-emerald-400/30 text-emerald-300"
          : "bg-white/[0.02] border-white/10 text-zinc-500 hover:text-zinc-300"
      }`}>
      <span className="flex items-center gap-1.5"><Icon className="h-3 w-3" /> {label}</span>
      <span>{checked ? "ON" : "OFF"}</span>
    </button>
  );
}

function OverridesPanel({ overrides, groups, flags, onRemove, onChanged, userId }: {
  overrides: Override[]; groups: Group[]; flags: Flag[];
  onRemove: (id: string) => void; onChanged: () => void; userId: string | null;
}) {
  const [flagKey, setFlagKey] = useState("");
  const [target, setTarget] = useState<{ type: "user" | "group"; value: string }>({ type: "user", value: "" });
  const [enabled, setEnabled] = useState(true);
  const [reason, setReason] = useState("");
  const { toast } = useToast();

  const add = async () => {
    if (!flagKey || !target.value) return;
    const row: any = {
      flag_key: flagKey, enabled, reason: reason || null, created_by: userId,
      ...(target.type === "user" ? { user_id: target.value } : { group_id: target.value }),
    };
    const { error } = await (supabase as any).from("feature_flag_overrides").insert(row);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { clearFlagCache(); setReason(""); setTarget({ ...target, value: "" }); onChanged(); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-3">Add override</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <select value={flagKey} onChange={e => setFlagKey(e.target.value)}
            className="bg-black/30 border border-white/10 rounded-md px-2 py-2 text-sm">
            <option value="">Choose flag…</option>
            {flags.map(f => <option key={f.id} value={f.feature_key}>{f.feature_key}</option>)}
          </select>
          <select value={target.type} onChange={e => setTarget({ type: e.target.value as any, value: "" })}
            className="bg-black/30 border border-white/10 rounded-md px-2 py-2 text-sm">
            <option value="user">User ID</option>
            <option value="group">Group</option>
          </select>
          {target.type === "user" ? (
            <Input placeholder="user uuid…" value={target.value}
              onChange={e => setTarget({ ...target, value: e.target.value })}
              className="bg-black/30 border-white/10 text-sm" />
          ) : (
            <select value={target.value} onChange={e => setTarget({ ...target, value: e.target.value })}
              className="bg-black/30 border border-white/10 rounded-md px-2 py-2 text-sm">
              <option value="">Choose group…</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          )}
          <Input placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)}
            className="bg-black/30 border-white/10 text-sm" />
          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <span className="text-xs text-zinc-400">{enabled ? "ENABLE" : "DISABLE"}</span>
            <Button size="sm" onClick={add} className="ml-auto">
              <Plus className="h-3.5 w-3.5 mr-1" />Add
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.015] divide-y divide-white/[0.05]">
        {overrides.map(o => {
          const g = groups.find(g => g.id === o.group_id);
          return (
            <div key={o.id} className="px-4 py-3 text-xs flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-zinc-200">{o.flag_key}</code>
                  <Badge className={o.enabled
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
                    : "bg-red-500/15 text-red-300 border-red-400/30"}>
                    {o.enabled ? "ENABLED" : "DISABLED"}
                  </Badge>
                  <span className="text-zinc-500">
                    {g ? `group: ${g.label}` : `user: ${o.user_id?.slice(0, 8)}…`}
                  </span>
                </div>
                {o.reason && <div className="text-zinc-500 mt-1">{o.reason}</div>}
              </div>
              <button onClick={() => onRemove(o.id)} className="text-zinc-500 hover:text-red-400">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
        {overrides.length === 0 && <div className="px-4 py-8 text-center text-zinc-500 text-sm">No overrides.</div>}
      </div>
    </div>
  );
}

function GroupsPanel({ groups, onChanged }: { groups: Group[]; onChanged: () => void }) {
  const [members, setMembers] = useState<Record<string, number>>({});
  const [active, setActive] = useState<string | null>(null);
  const [memberRows, setMemberRows] = useState<{ user_id: string }[]>([]);
  const [newUid, setNewUid] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const counts: Record<string, number> = {};
      for (const g of groups) {
        const { count } = await (supabase as any).from("rollout_group_members")
          .select("*", { count: "exact", head: true }).eq("group_id", g.id);
        counts[g.id] = count || 0;
      }
      setMembers(counts);
    })();
  }, [groups]);

  const openGroup = async (id: string) => {
    setActive(id);
    const { data } = await (supabase as any).from("rollout_group_members")
      .select("user_id").eq("group_id", id).limit(200);
    setMemberRows((data as any[]) || []);
  };

  const addMember = async () => {
    if (!active || !newUid) return;
    const { error } = await (supabase as any).from("rollout_group_members")
      .insert({ group_id: active, user_id: newUid });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { setNewUid(""); openGroup(active); onChanged(); }
  };
  const removeMember = async (uid: string) => {
    if (!active) return;
    await (supabase as any).from("rollout_group_members")
      .delete().eq("group_id", active).eq("user_id", uid);
    openGroup(active);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-2">
        {groups.map(g => (
          <button key={g.id} onClick={() => openGroup(g.id)}
            className={`w-full text-left rounded-xl border p-3 transition ${
              active === g.id ? "border-violet-400/40 bg-violet-500/5" : "border-white/[0.08] bg-white/[0.02] hover:border-white/15"
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">{g.label}</div>
                <code className="text-[11px] text-zinc-500">{g.key}</code>
              </div>
              <Badge variant="outline" className="border-white/15 text-zinc-300">{members[g.id] ?? 0}</Badge>
            </div>
            {g.description && <p className="text-[11px] text-zinc-500 mt-1">{g.description}</p>}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        {!active ? (
          <div className="text-center text-zinc-500 text-sm py-12">Pick a group to manage members.</div>
        ) : (
          <>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-3">Members</div>
            <div className="flex gap-2 mb-3">
              <Input placeholder="user uuid…" value={newUid} onChange={e => setNewUid(e.target.value)}
                className="bg-black/30 border-white/10 text-sm" />
              <Button size="sm" onClick={addMember}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.05]">
              {memberRows.map(m => (
                <div key={m.user_id} className="flex items-center justify-between py-1.5 text-xs">
                  <code className="text-zinc-300">{m.user_id}</code>
                  <button onClick={() => removeMember(m.user_id)} className="text-zinc-500 hover:text-red-400">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {memberRows.length === 0 && <div className="text-center text-zinc-500 text-sm py-6">No members.</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}