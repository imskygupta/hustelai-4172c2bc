import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert, ShieldCheck, ShieldX, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Row = {
  user_id: string;
  email: string | null;
  verification_status: "pending" | "verified" | "suspended" | "flagged" | "restricted_security_review";
  verification_deadline: string | null;
  verified_at: string | null;
  restricted_reason: string | null;
  subscription_tier: string | null;
  created_at: string;
};

type Event = {
  id: string;
  user_id: string | null;
  email: string | null;
  event_type: string;
  severity: "info" | "warn" | "critical";
  metadata: any;
  created_at: string;
};

type Conflict = {
  id: string;
  user_id: string;
  kind: string;
  evidence: any;
  detected_at: string;
  resolved_at: string | null;
  resolution: string | null;
};

const statusColors: Record<Row["verification_status"], string> = {
  verified: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  suspended: "bg-destructive/10 text-destructive border-destructive/30",
  flagged: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  restricted_security_review: "bg-rose-500/10 text-rose-600 border-rose-500/30",
};

function fmt(ts: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString();
}

function relative(ts: string | null) {
  if (!ts) return "—";
  const diff = new Date(ts).getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  if (mins < 60) return `${diff < 0 ? "expired " : ""}${mins}m${diff < 0 ? " ago" : ""}`;
  const hrs = Math.round(mins / 60);
  return `${diff < 0 ? "expired " : ""}${hrs}h${diff < 0 ? " ago" : ""}`;
}

export default function SecurityUsers() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  const isAdmin = profile?.subscription_tier === "infinity"; // placeholder; real check via has_role on server

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: e }, { data: c }, { data: a }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "user_id, email, verification_status, verification_deadline, verified_at, restricted_reason, subscription_tier, created_at",
        )
        .in("verification_status", ["pending", "suspended", "flagged", "restricted_security_review"])
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("security_auth_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      (supabase as any)
        .from("identity_conflict_queue")
        .select("*")
        .is("resolved_at", null)
        .order("detected_at", { ascending: false })
        .limit(100),
      (supabase as any).rpc("get_security_audit_summary"),
    ]);
    setRows((p as Row[]) ?? []);
    setEvents((e as Event[]) ?? []);
    setConflicts((c as Conflict[]) ?? []);
    setAudit(a ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const manualVerify = async (userId: string, email: string | null) => {
    setWorking(userId);
    const { error } = await supabase
      .from("profiles")
      .update({
        verification_status: "verified",
        verified_at: new Date().toISOString(),
        verification_deadline: null,
        restricted_reason: null,
      })
      .eq("user_id", userId);
    setWorking(null);
    if (error) return toast.error(error.message);
    await supabase.rpc("log_security_auth_event", {
      _user_id: userId,
      _email: email,
      _event_type: "account.manual_verify",
      _severity: "warn",
      _metadata: { source: "admin_panel" },
    });
    toast.success("Account manually verified");
    load();
  };

  const suspend = async (userId: string, email: string | null) => {
    setWorking(userId);
    const { error } = await supabase
      .from("profiles")
      .update({
        verification_status: "suspended",
        restricted_reason: "admin_action",
      })
      .eq("user_id", userId);
    setWorking(null);
    if (error) return toast.error(error.message);
    await supabase.rpc("log_security_auth_event", {
      _user_id: userId,
      _email: email,
      _event_type: "account.suspended",
      _severity: "warn",
      _metadata: { source: "admin_panel" },
    });
    toast.success("Account suspended");
    load();
  };

  const runAutoSuspend = async () => {
    const { data, error } = await supabase.rpc("auto_suspend_unverified");
    if (error) return toast.error(error.message);
    toast.success(`Suspended ${data ?? 0} stale accounts`);
    load();
  };

  const resolveConflict = async (id: string, userId: string, action: "mark_safe" | "revoke_sessions" | "force_reset") => {
    setWorking(id);
    try {
      if (action === "revoke_sessions" || action === "force_reset") {
        await supabase.rpc("revoke_user_sessions", { _user_id: userId });
      }
      if (action === "force_reset") {
        await supabase
          .from("profiles")
          .update({
            restricted_pending_ownership_review: true,
            restricted_reason: "admin_force_ownership_reset",
            verification_status: "restricted_security_review",
          })
          .eq("user_id", userId);
      }
      await (supabase as any)
        .from("identity_conflict_queue")
        .update({ resolved_at: new Date().toISOString(), resolution: action })
        .eq("id", id);
      toast.success("Conflict updated");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update conflict");
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Auth integrity
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pending, suspended and flagged accounts. Verification spam, provider
              collisions and suspicious switches are logged below.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button size="sm" onClick={runAutoSuspend}>
              Auto-suspend expired
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Accounts requiring attention</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No pending or suspended accounts. System healthy.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-2 pr-3">Email</th>
                      <th className="text-left py-2 pr-3">Status</th>
                      <th className="text-left py-2 pr-3">Deadline</th>
                      <th className="text-left py-2 pr-3">Reason</th>
                      <th className="text-left py-2 pr-3">Tier</th>
                      <th className="text-right py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.user_id} className="border-b border-border/40">
                        <td className="py-2 pr-3 font-mono text-xs">{r.email}</td>
                        <td className="py-2 pr-3">
                          <Badge variant="outline" className={statusColors[r.verification_status]}>
                            {r.verification_status}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">
                          {relative(r.verification_deadline)}
                        </td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">
                          {r.restricted_reason ?? "—"}
                        </td>
                        <td className="py-2 pr-3 text-xs">{r.subscription_tier ?? "free"}</td>
                        <td className="py-2 text-right space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={working === r.user_id || r.verification_status === "verified"}
                            onClick={() => manualVerify(r.user_id, r.email)}
                          >
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={working === r.user_id || r.verification_status === "suspended"}
                            onClick={() => suspend(r.user_id, r.email)}
                          >
                            Suspend
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Recent security events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No events recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border/40">
                {events.map((ev) => (
                  <li key={ev.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {ev.severity === "critical" ? (
                          <ShieldX className="h-3.5 w-3.5 text-destructive" />
                        ) : ev.severity === "warn" ? (
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                        ) : (
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                        <span className="font-medium">{ev.event_type}</span>
                        {ev.email && (
                          <span className="text-xs font-mono text-muted-foreground truncate">
                            {ev.email}
                          </span>
                        )}
                      </div>
                      {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {JSON.stringify(ev.metadata)}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {fmt(ev.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {audit && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Post-hardening audit snapshot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Stat label="Multi-provider emails" value={audit.multi_provider_emails ?? 0} />
                <Stat label="Orphan password accounts" value={audit.orphan_password_accounts ?? 0} />
                <Stat label="Suspended / review" value={audit.suspended_shells ?? 0} />
                <Stat label="Repeat collision users" value={audit.repeat_collision_users ?? 0} />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" /> Identity conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {conflicts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No open conflicts.</p>
            ) : (
              <ul className="divide-y divide-border/40">
                {conflicts.map((c) => (
                  <li key={c.id} className="py-3 flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-[10px]">{c.kind}</Badge>
                        <span className="text-xs text-muted-foreground">{fmt(c.detected_at)}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-1 truncate max-w-[480px]">
                        user_id={c.user_id} · {JSON.stringify(c.evidence)}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="outline" disabled={working === c.id}
                        onClick={() => resolveConflict(c.id, c.user_id, "revoke_sessions")}>
                        Revoke sessions
                      </Button>
                      <Button size="sm" variant="outline" disabled={working === c.id}
                        onClick={() => resolveConflict(c.id, c.user_id, "force_reset")}>
                        Force reset
                      </Button>
                      <Button size="sm" variant="ghost" disabled={working === c.id}
                        onClick={() => resolveConflict(c.id, c.user_id, "mark_safe")}>
                        Mark safe
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border/40 p-3">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}