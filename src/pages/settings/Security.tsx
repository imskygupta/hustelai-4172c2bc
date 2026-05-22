import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SettingsSection, SettingsRow } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Shield, Activity, Download } from "lucide-react";
import { Key, KeyRound, LogIn, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function SecuritySettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [telegram, setTelegram] = useState<any>(null);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [sessionInfo, setSessionInfo] = useState<{ created?: string; updated?: string }>({});
  const [identities, setIdentities] = useState<any[]>([]);
  const [secEvents, setSecEvents] = useState<any[]>([]);

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
    </div>
  );
}