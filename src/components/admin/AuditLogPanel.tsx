import { useEffect, useMemo, useState } from "react";
import { ScrollText, Search, RefreshCw, User2, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OperatorHeader, OperatorChips, OperatorEmpty, OperatorExplainer } from "./OperatorScaffold";
import { fetchRecentAudit, fetchAuditForTarget, type OperatorAuditEntry } from "@/lib/audit/recordOperatorAction";
import { cn } from "@/lib/utils";

type Props = {
  /** Optional: scope viewer to a single user. */
  targetType?: string;
  targetId?: string;
  compact?: boolean;
  limit?: number;
};

const ACTION_CATEGORY: Record<string, { label: string; tone: string }> = {
  role: { label: "Role", tone: "bg-violet-500/10 text-violet-300 border-violet-500/30" },
  tier: { label: "Tier", tone: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  billing: { label: "Billing", tone: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  credits: { label: "Credits", tone: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  user: { label: "User", tone: "bg-destructive/10 text-destructive border-destructive/30" },
  impersonation: { label: "Impersonation", tone: "bg-destructive/10 text-destructive border-destructive/30" },
  verification: { label: "Verification", tone: "bg-sky-500/10 text-sky-300 border-sky-500/30" },
  forum: { label: "Forum", tone: "bg-pink-500/10 text-pink-300 border-pink-500/30" },
  telegram: { label: "Telegram", tone: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30" },
  runtime: { label: "Runtime", tone: "bg-orange-500/10 text-orange-300 border-orange-500/30" },
  feature_flag: { label: "Flag", tone: "bg-orange-500/10 text-orange-300 border-orange-500/30" },
};

function categorize(action: string) {
  const root = action.split(".")[0] ?? action;
  return ACTION_CATEGORY[root] ?? { label: root, tone: "bg-muted text-muted-foreground border-border" };
}

export function AuditLogPanel({ targetType, targetId, compact, limit = 100 }: Props) {
  const [rows, setRows] = useState<OperatorAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const data = targetType && targetId
      ? await fetchAuditForTarget(targetType, targetId, limit)
      : await fetchRecentAudit(limit);
    setRows(data);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [targetType, targetId, limit]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.action.split(".")[0]));
    return Array.from(set);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && !r.action.startsWith(filter)) return false;
      if (!q) return true;
      return [r.action, r.actor_email, r.target_label, r.target_id, r.reason]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, filter, query]);

  return (
    <div className="space-y-4">
      {!compact && (
        <>
          <OperatorHeader
            icon={ScrollText}
            title="Operator audit log"
            count={`${rows.length} entries`}
            badges={[{ kind: "production" }]}
            right={
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} /> Refresh
              </Button>
            }
          />
          <OperatorExplainer tone="info" title="Append-only trail">
            Every privileged action goes through <code>record_operator_action</code>. Entries
            cannot be edited or deleted. Use this when investigating incidents or reviewing escalations.
          </OperatorExplainer>
          <OperatorChips
            value={filter}
            onChange={setFilter}
            options={[
              { key: "all", label: "All", count: rows.length },
              ...categories.map((c) => ({
                key: c, label: ACTION_CATEGORY[c]?.label ?? c,
                count: rows.filter((r) => r.action.startsWith(c)).length,
              })),
            ]}
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search actor, target, reason, action…"
              className="pl-9 h-9"
            />
          </div>
        </>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading audit trail…</div>
      ) : filtered.length === 0 ? (
        <OperatorEmpty title="No audit entries" hint="Privileged operator actions will appear here." />
      ) : (
        <ul className="rounded-lg border divide-y bg-card">
          {filtered.map((r) => {
            const cat = categorize(r.action);
            return (
              <li key={r.id} className="p-3 text-sm flex items-start gap-3">
                <Badge variant="outline" className={cn("text-[10px] shrink-0", cat.tone)}>
                  {cat.label}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium font-mono text-[12px]">{r.action}</span>
                    {r.target_label && (
                      <span className="text-muted-foreground text-[12px]">→ {r.target_label}</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      {r.actor_role === "admin" ? <Shield className="w-3 h-3" /> : <User2 className="w-3 h-3" />}
                      {r.actor_email ?? r.actor_user_id?.slice(0, 8) ?? "system"}
                    </span>
                    <span>·</span>
                    <span>{new Date(r.created_at).toLocaleString()}</span>
                    {r.reason && (<><span>·</span><span className="italic">"{r.reason}"</span></>)}
                  </div>
                  {r.metadata && Object.keys(r.metadata).length > 0 && (
                    <details className="mt-1.5">
                      <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">metadata</summary>
                      <pre className="mt-1 text-[10px] bg-muted/40 rounded p-2 overflow-x-auto">
{JSON.stringify(r.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}