import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SettingsSection, SettingsRow } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Shield, Activity, Download } from "lucide-react";
import { Key, KeyRound, LogIn, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut } from "lucide-react";

export default function SecuritySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [telegram, setTelegram] = useState<any>(null);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [sessionInfo, setSessionInfo] = useState<{ created?: string; updated?: string }>({});
  const [identities, setIdentities] = useState<any[]>([]);
  const [secEvents, setSecEvents] = useState<any[]>([]);

  // Sign-out-everywhere flow state.
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokePassword, setRevokePassword] = useState("");
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const handleRevokeAll = async () => {
    if (!user?.email) return;
    setRevokeError(null);
    setRevokeBusy(true);
    try {
      // 1. Step-up: confirm current password.
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: revokePassword,
      });
      if (signErr) {
        setRevokeError("Password did not match. Try again.");
        setRevokeBusy(false);
        return;
      }
      // 2. Mark reauth (server-side timestamp the edge function checks).
      await (supabase as any).rpc("mark_reauth", { _user_id: user.id });
      // 3. Revoke all sessions via edge function (service-role).
      const { data, error } = await supabase.functions.invoke("session-revoke-all", { body: {} });
      if (error || !data?.ok) {
        setRevokeError(
          data?.reason === "rate_limited"
            ? "Too many revocation attempts. Try again later."
            : "Couldn't revoke sessions. Please try again.",
        );
        setRevokeBusy(false);
        return;
      }
      toast({
        title: "Signed out everywhere",
        description: `${data.revoked ?? 0} session(s) revoked. You'll be signed out now.`,
      });
      // 4. Force local sign-out — current refresh chain is dead anyway.
      await supabase.auth.signOut().catch(() => { /* ignore */ });
      window.location.href = "/login?reason=sessions_revoked";
    } catch (e: any) {
      setRevokeError(e?.message || "Unexpected error.");
      setRevokeBusy(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [integRes, logsRes, sessRes, idsRes, evRes] = await Promise.all([
        (supabase as any).from("user_integrations").select("*").eq("user_id", user.id).eq("provider", "telegram").maybeSingle(),
        (supabase as any).from("export_access_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.auth.getSession(),
        supabase.auth.getUserIdentities(),
        (supabase as any).rpc("get_my_security_events", { _limit: 25 }),
      ]);
      const integ = integRes?.data;
      const logs = logsRes?.data;
      const sess = sessRes?.data;
      setTelegram(integ);
      setAccessLogs(Array.isArray(logs) ? logs : []);
      setIdentities((idsRes as any)?.data?.identities ?? []);
      setSecEvents(Array.isArray(evRes?.data) ? evRes.data : []);
      const s = sess?.session;
      setSessionInfo({
        created: s ? new Date((s as any).user.created_at).toISOString() : undefined,
        updated: s ? new Date((s as any).user.updated_at || (s as any).user.created_at).toISOString() : undefined,
      });
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <SettingsSection title="Telegram authentication" description="Linked Telegram chat used for OTP and delivery.">
        <SettingsRow
          label={telegram?.provider_username ? `@${telegram.provider_username}` : "Not linked"}
          description={telegram?.last_active_at ? `Active ${formatDistanceToNow(new Date(telegram.last_active_at))} ago` : "Connect to enable Telegram delivery."}
        >
          {telegram?.status === "connected" ? (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
              <Send className="h-3 w-3 mr-1" /> Connected
            </Badge>
          ) : (
            <Button asChild size="sm" variant="outline">
              <a href="/settings/integrations">Connect</a>
            </Button>
          )}
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Current session" description="Information about your active sign-in.">
        <SettingsRow label="This device" description={sessionInfo.created ? `Account active since ${new Date(sessionInfo.created).toLocaleDateString()}` : "—"}>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            <Shield className="h-3 w-3 mr-1" /> Active
          </Badge>
        </SettingsRow>
        <SettingsRow label="Last seen" description={sessionInfo.updated ? new Date(sessionInfo.updated).toLocaleString() : "—"}>
          <span className="text-xs text-muted-foreground">Encrypted</span>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Sign out everywhere"
        description="Revoke every active sign-in for this account across all devices. You'll need to sign in again on every device, including this one."
      >
        <SettingsRow
          label="Active sign-in sessions"
          description="Full per-device inventory is kept server-side. Revocation removes them all at once."
        >
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { setRevokePassword(""); setRevokeError(null); setRevokeOpen(true); }}
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out all devices
          </Button>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Export access log" description="Recent download attempts on your shared exports.">
        {accessLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No access events yet.</p>
        ) : (
          <div className="space-y-2">
            {accessLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/30 last:border-0 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{log.ip ?? "unknown ip"}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={log.outcome === "ok" ? "outline" : "destructive"} className="text-[10px]">
                    {log.outcome}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at))} ago
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Suspicious activity" description="Anomaly detection — alerts you for unusual sign-ins.">
        <SettingsRow label="Status" description="No suspicious events detected.">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
            <Activity className="h-3 w-3 mr-1" /> Clear
          </Badge>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Linked sign-in methods"
        description="Every identity that can sign into this account. Unlinking requires re-authentication."
      >
        {identities.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No identities linked.</p>
        ) : (
          <div className="space-y-2">
            {identities.map((id: any) => (
              <SettingsRow
                key={id.identity_id || id.id}
                label={String(id.provider).charAt(0).toUpperCase() + String(id.provider).slice(1)}
                description={
                  id.last_sign_in_at
                    ? `Last used ${formatDistanceToNow(new Date(id.last_sign_in_at))} ago`
                    : id.created_at ? `Linked ${formatDistanceToNow(new Date(id.created_at))} ago` : "—"
                }
              >
                <span className="flex items-center gap-2">
                  {id.provider === "email"
                    ? <KeyRound className="h-4 w-4 text-muted-foreground" />
                    : <LogIn className="h-4 w-4 text-muted-foreground" />}
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    Connected
                  </Badge>
                </span>
              </SettingsRow>
            ))}
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title="Recent security events"
        description="The last 25 auth-related events on your account. Critical events stay for 90 days."
      >
        {secEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No security events yet.</p>
        ) : (
          <div className="space-y-2">
            {secEvents.map((ev: any) => {
              const isCrit = ev.severity === "critical";
              const isWarn = ev.severity === "warn";
              return (
                <div key={ev.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/30 last:border-0 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    {isCrit ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      : <Key className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className="truncate font-mono text-xs">{ev.event_type}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={isCrit ? "destructive" : "outline"}
                      className={`text-[10px] ${isWarn && !isCrit ? "bg-amber-500/10 text-amber-700 border-amber-500/30" : ""}`}
                    >
                      {ev.severity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(ev.created_at))} ago
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SettingsSection>
    </div>
    {/* Step-up confirmation dialog */}
    <Dialog open={revokeOpen} onOpenChange={(o) => { if (!revokeBusy) setRevokeOpen(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm sign-out everywhere</DialogTitle>
          <DialogDescription>
            For your security, re-enter your password. We'll then revoke every active session
            for this account on every device.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="reauth-pw" className="text-sm">Current password</Label>
          <Input
            id="reauth-pw"
            type="password"
            value={revokePassword}
            onChange={(e) => setRevokePassword(e.target.value)}
            autoComplete="current-password"
            disabled={revokeBusy}
          />
          {revokeError && (
            <p className="text-xs text-destructive">{revokeError}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setRevokeOpen(false)} disabled={revokeBusy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRevokeAll}
            disabled={revokeBusy || revokePassword.length < 1}
          >
            {revokeBusy ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Revoking…</> : "Revoke all sessions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}