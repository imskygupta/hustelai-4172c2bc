import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { workspaceDb } from "@/integrations/workspace/client";
import { communityDb } from "@/integrations/community/client";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Database, Zap, Mail, CreditCard } from "lucide-react";

type Status = "idle" | "checking" | "ok" | "fail";
interface Check {
  id: string;
  label: string;
  group: "Database" | "Edge Function" | "Integration";
  ref?: string;
  status: Status;
  detail?: string;
  ms?: number;
}

const initial: Check[] = [
  { id: "db-primary", label: "Primary DB (auth / profiles / billing)", group: "Database", ref: "vbnqaovxatucrgtnggea", status: "idle" },
  { id: "db-workspace", label: "Workspace DB (Work Hub / Canvas)", group: "Database", ref: "utflzmecghdtcjupgdan", status: "idle" },
  { id: "db-community", label: "Community DB (Forum / Discord)", group: "Database", ref: "qeswhaytgvosfzzgraef", status: "idle" },
  { id: "fn-ai-chatbot", label: "ai-chatbot (LOVABLE_API_KEY)", group: "Edge Function", status: "idle" },
  { id: "fn-work-api", label: "work-api (writes to Workspace DB)", group: "Edge Function", status: "idle" },
  { id: "fn-dodo-checkout", label: "dodo-checkout (Dodo Payments)", group: "Edge Function", status: "idle" },
  { id: "fn-send-email", label: "send-email (RESEND_API_KEY)", group: "Edge Function", status: "idle" },
];

async function pingPrimary() {
  const t = performance.now();
  const { error } = await supabase.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
  return { ok: !error, ms: performance.now() - t, detail: error?.message };
}
async function pingWorkspace() {
  const t = performance.now();
  const { error } = await workspaceDb.from("work_invoices").select("id", { head: true, count: "exact" }).limit(1);
  return { ok: !error, ms: performance.now() - t, detail: error?.message };
}
async function pingCommunity() {
  const t = performance.now();
  const { error } = await communityDb.from("forum_posts").select("id", { head: true, count: "exact" }).limit(1);
  return { ok: !error, ms: performance.now() - t, detail: error?.message };
}
async function pingFn(name: string, body: any = { ping: true }) {
  const t = performance.now();
  try {
    const { error } = await supabase.functions.invoke(name, { body });
    // We treat any response (even 4xx for a ping payload) as "function reachable".
    // Hard transport errors (CORS / 5xx / not deployed) surface as `error`.
    const ok = !error || /400|422/.test(String(error.message || ""));
    return { ok, ms: performance.now() - t, detail: error?.message };
  } catch (e: any) {
    return { ok: false, ms: performance.now() - t, detail: e?.message || "network error" };
  }
}

export function SystemHealth() {
  const [checks, setChecks] = useState<Check[]>(initial);
  const [running, setRunning] = useState(false);

  async function runAll() {
    setRunning(true);
    setChecks(initial.map(c => ({ ...c, status: "checking" })));
    const update = (id: string, patch: Partial<Check>) =>
      setChecks(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));

    const tasks: Promise<void>[] = [
      pingPrimary().then(r => update("db-primary", { status: r.ok ? "ok" : "fail", ms: r.ms, detail: r.detail })),
      pingWorkspace().then(r => update("db-workspace", { status: r.ok ? "ok" : "fail", ms: r.ms, detail: r.detail })),
      pingCommunity().then(r => update("db-community", { status: r.ok ? "ok" : "fail", ms: r.ms, detail: r.detail })),
      pingFn("ai-chatbot", { messages: [{ role: "user", content: "ping" }] }).then(r => update("fn-ai-chatbot", { status: r.ok ? "ok" : "fail", ms: r.ms, detail: r.detail })),
      pingFn("work-api", { kind: "__ping" }).then(r => update("fn-work-api", { status: r.ok ? "ok" : "fail", ms: r.ms, detail: r.detail })),
      pingFn("dodo-checkout", { ping: true }).then(r => update("fn-dodo-checkout", { status: r.ok ? "ok" : "fail", ms: r.ms, detail: r.detail })),
      pingFn("send-email", { ping: true }).then(r => update("fn-send-email", { status: r.ok ? "ok" : "fail", ms: r.ms, detail: r.detail })),
    ];
    await Promise.allSettled(tasks);
    setRunning(false);
  }

  const groups = ["Database", "Edge Function", "Integration"] as const;
  const groupIcon = { Database, "Edge Function": Zap, Integration: Mail } as const;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display font-bold text-lg">System Health</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Live ping of all 3 databases + critical edge functions. Run after every workspace transfer
            or deploy to verify your secrets, DBs and integrations are wired correctly.
          </p>
        </div>
        <Button onClick={runAll} disabled={running} className="gap-2">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Run all checks
        </Button>
      </div>

      {groups.map(g => {
        const items = checks.filter(c => c.group === g);
        if (items.length === 0) return null;
        const Icon = groupIcon[g];
        return (
          <div key={g} className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Icon className="w-4 h-4" /> {g}
            </div>
            <div className="grid md:grid-cols-2 gap-2">
              {items.map(c => (
                <div key={c.id} className="glass rounded-xl p-3 flex items-start justify-between gap-3 border-primary/10">
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{c.label}</div>
                    {c.ref && <div className="text-[11px] font-mono text-muted-foreground truncate">{c.ref}</div>}
                    {c.detail && c.status === "fail" && (
                      <div className="text-[11px] text-destructive mt-1 break-words">{c.detail}</div>
                    )}
                    {typeof c.ms === "number" && c.status !== "fail" && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">{Math.round(c.ms)} ms</div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {c.status === "idle" && <Badge variant="outline" className="text-[10px]">idle</Badge>}
                    {c.status === "checking" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    {c.status === "ok" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    {c.status === "fail" && <XCircle className="w-5 h-5 text-destructive" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="glass rounded-xl p-4 text-xs text-muted-foreground space-y-1 border-primary/10">
        <div className="flex items-center gap-2 font-semibold text-foreground"><CreditCard className="w-3.5 h-3.5" /> After transfer checklist</div>
        <div>1. Repoint Vercel → Settings → Git → Disconnect → Connect new repo → branch <code>main</code>.</div>
        <div>2. Verify all secrets in Connectors (LOVABLE_API_KEY, SMTP, Dodo, Resend, Discord, Inngest).</div>
        <div>3. Run all checks above — every row should be green.</div>
        <div>4. Test ₹1 payment via <code>/plans</code> to confirm Dodo end-to-end.</div>
      </div>
    </div>
  );
}
