import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users as UsersIcon, ShieldAlert, ShieldCheck, Crown, Sparkles, Trash2, Eye, MessageSquare, Wallet as WalletIcon, AlertTriangle, Loader2, ChevronRight, Bot, Activity } from "lucide-react";
import { Ban, LogOut, RefreshCcw, Receipt, ShieldOff } from "lucide-react";
import { OpsBadge } from "@/components/admin/OpsBadge";
import { OpsHint } from "@/components/admin/OpsHint";
import { OperatorLink } from "@/components/admin/OperatorLink";
import { DangerActionDialog } from "@/components/admin/DangerActionDialog";
import { Label } from "@/components/ui/label";
import {
  suspendUser, unsuspendUser, forceLogoutUser, resetCredits, requestRefund,
} from "@/lib/admin/destructiveActions";
import { loadUserSignals, deriveUserStatus, STATUS_STYLES, type UserSignalsMap, type UserStatus } from "@/lib/admin/users-intel";
import { cn } from "@/lib/utils";

type ProfileLike = {
  id: string; user_id: string; email: string | null; display_name: string | null;
  subscription_tier: string; search_count: number; created_at: string;
  phone: string | null; bio: string | null; resume_url: string | null;
  suspended_at?: string | null;
  suspended_reason?: string | null;
};

export type UsersPanelProps = {
  users: ProfileLike[];
  onChangeTier: (userId: string, tier: string) => Promise<void> | void;
  onImpersonate: (userId: string, email: string) => Promise<void> | void;
  onOpenChat: (userId: string) => void;
  onDelete: (userId: string, email: string) => Promise<void> | void;
};

type FilterKey =
  | "all" | "paid" | "free" | "active_today" | "suspicious"
  | "telegram" | "new" | "failed_payments" | "internal" | "high_usage";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "free", label: "Free" },
  { key: "active_today", label: "Active today" },
  { key: "suspicious", label: "Suspicious" },
  { key: "telegram", label: "Telegram linked" },
  { key: "new", label: "New (7d)" },
  { key: "failed_payments", label: "Failed payments" },
  { key: "internal", label: "Internal / admin" },
  { key: "high_usage", label: "High usage" },
];

function fmtRelative(iso: string | null) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function UsersPanel({ users, onChangeTier, onImpersonate, onOpenChat, onDelete }: UsersPanelProps) {
  const [signals, setSignals] = useState<UserSignalsMap>({});
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!users.length) return;
      setLoading(true);
      const ids = users.map((u) => u.user_id);
      const emails = users.map((u) => u.email);
      const m = await loadUserSignals(ids, emails);
      if (alive) { setSignals(m); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [users]);

  const enriched = useMemo(() => {
    return users.map((u) => {
      const s = signals[u.user_id] || {
        telegram_chat_id: null, telegram_username: null, telegram_last_active_at: null,
        wallet_balance: 0, paid_orders: 0, failed_orders: 0, last_paid_at: null, total_paid: 0,
        blocked_attempts: 0, signup_source: null, is_admin: false, is_moderator: false,
      };
      const status: UserStatus = deriveUserStatus(u, s);
      return { u, s, status };
    });
  }, [users, signals]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    return enriched.filter(({ u, s, status }) => {
      if (q) {
        const hay = [u.display_name, u.email, u.phone, u.user_id, s.telegram_username].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      switch (filter) {
        case "paid": return u.subscription_tier !== "free" || s.paid_orders > 0;
        case "free": return u.subscription_tier === "free" && s.paid_orders === 0;
        case "active_today":
          return s.telegram_last_active_at ? new Date(s.telegram_last_active_at).getTime() >= todayMs : false;
        case "suspicious": return status === "suspicious";
        case "telegram": return !!s.telegram_chat_id;
        case "new": return new Date(u.created_at).getTime() >= sevenDaysAgo;
        case "failed_payments": return s.failed_orders > 0;
        case "internal": return s.is_admin || s.is_moderator;
        case "high_usage": return (u.search_count ?? 0) >= 50;
        default: return true;
      }
    });
  }, [enriched, query, filter]);

  const counts = useMemo(() => {
    const c = { total: enriched.length, paid: 0, suspicious: 0, telegram: 0, internal: 0, failed: 0 };
    enriched.forEach(({ u, s, status }) => {
      if (u.subscription_tier !== "free" || s.paid_orders > 0) c.paid++;
      if (status === "suspicious") c.suspicious++;
      if (s.telegram_chat_id) c.telegram++;
      if (s.is_admin || s.is_moderator) c.internal++;
      if (s.failed_orders > 0) c.failed++;
    });
    return c;
  }, [enriched]);

  const selected = selectedId ? enriched.find((e) => e.u.user_id === selectedId) ?? null : null;

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <UsersIcon className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Users</h2>
          <span className="text-xs text-muted-foreground">{filtered.length} / {counts.total}</span>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-1" />}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="px-1.5 py-0.5 rounded bg-muted/60">Paid {counts.paid}</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">Suspicious {counts.suspicious}</span>
          <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300">Telegram {counts.telegram}</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-300">Internal {counts.internal}</span>
        </div>
      </div>

      {/* Search + filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, phone, telegram, user id…"
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-2.5 py-1 rounded-full border text-[11px] uppercase tracking-wider transition",
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dense table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)_90px_minmax(0,0.7fr)_72px_72px_56px] items-center gap-3 px-4 py-2 border-b border-border/60 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div>User</div>
          <div>Status / Signals</div>
          <div>Tier</div>
          <div>Last active</div>
          <div className="text-right">Wallet</div>
          <div className="text-right">Searches</div>
          <div className="text-right">Open</div>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">No users match the current filter.</div>
        )}
        {filtered.map(({ u, s, status }) => {
          const style = STATUS_STYLES[status];
          const initial = ((u.display_name || u.email || "?")[0] || "?").toUpperCase();
          return (
            <button
              key={u.user_id}
              onClick={() => setSelectedId(u.user_id)}
              className={cn(
                "w-full grid grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)_90px_minmax(0,0.7fr)_72px_72px_56px] items-center gap-3 px-4 py-2.5 text-left border-b border-border/30 last:border-0 hover:bg-muted/40 transition",
                selectedId === u.user_id && "bg-muted/60",
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {initial}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{u.display_name || u.email || u.user_id.slice(0, 8)}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{u.email || "no email"}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", style.cls)}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                  {style.label}
                </span>
                {s.telegram_chat_id && (
                  <span
                    title={`Telegram linked${s.telegram_username ? ` @${s.telegram_username}` : ""}`}
                    className="inline-flex items-center text-[10px] text-violet-400"
                  >
                    <Bot className="w-3 h-3" />
                  </span>
                )}
                {s.failed_orders > 0 && (
                  <span title={`${s.failed_orders} failed payments`} className="inline-flex items-center gap-0.5 text-[10px] text-amber-400">
                    <AlertTriangle className="w-3 h-3" />{s.failed_orders}
                  </span>
                )}
                {s.blocked_attempts > 0 && (
                  <span title={`${s.blocked_attempts} blocked signup attempts on this email`} className="inline-flex items-center gap-0.5 text-[10px] text-destructive">
                    <ShieldAlert className="w-3 h-3" />{s.blocked_attempts}
                  </span>
                )}
                {s.is_admin && <span className="text-[10px] text-slate-300">admin</span>}
                {s.is_moderator && !s.is_admin && <span className="text-[10px] text-slate-300">mod</span>}
              </div>
              <div>
                <TierPill tier={u.subscription_tier} />
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {fmtRelative(s.telegram_last_active_at || s.last_paid_at || u.created_at)}
              </div>
              <div className="text-right text-xs tabular-nums">{s.wallet_balance}</div>
              <div className="text-right text-xs tabular-nums">{u.search_count ?? 0}</div>
              <div className="text-right text-muted-foreground"><ChevronRight className="w-4 h-4 inline" /></div>
            </button>
          );
        })}
      </div>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <UserDrawer
              p={selected.u}
              s={selected.s}
              status={selected.status}
              onChangeTier={onChangeTier}
              onImpersonate={onImpersonate}
              onOpenChat={(id) => { onOpenChat(id); setSelectedId(null); }}
              onDelete={onDelete}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TierPill({ tier }: { tier: string }) {
  const Icon = tier === "infinity" ? Crown : tier === "elite" ? Crown : tier === "pro" ? ShieldCheck : Sparkles;
  const cls = tier === "infinity"
    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
    : tier === "elite"
      ? "bg-violet-500/10 text-violet-400 border-violet-500/30"
      : tier === "pro"
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
        : "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold", cls)}>
      <Icon className="w-3 h-3" /> {tier}
    </span>
  );
}

function UserDrawer({
  p, s, status, onChangeTier, onImpersonate, onOpenChat, onDelete,
}: {
  p: ProfileLike;
  s: import("@/lib/admin/users-intel").UserSignals;
  status: UserStatus;
  onChangeTier: (id: string, tier: string) => any;
  onImpersonate: (id: string, email: string) => any;
  onOpenChat: (id: string) => any;
  onDelete: (id: string, email: string) => any;
}) {
  const initial = ((p.display_name || p.email || "?")[0] || "?").toUpperCase();
  const style = STATUS_STYLES[status];
  const [showDanger, setShowDanger] = useState(false);

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="truncate">{p.display_name || p.email || "Unnamed user"}</div>
            <div className="text-xs font-normal text-muted-foreground truncate">{p.email}</div>
          </div>
        </SheetTitle>
        <SheetDescription className="sr-only">User detail and operator controls</SheetDescription>
      </SheetHeader>
      <div className="flex flex-wrap gap-1.5 pt-2">
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider", style.cls)}>
          {style.label}
        </span>
        <TierPill tier={p.subscription_tier} />
        {s.is_admin && <OpsBadge kind="internal">Admin</OpsBadge>}
        {s.is_moderator && !s.is_admin && <OpsBadge kind="internal">Moderator</OpsBadge>}
        {s.blocked_attempts > 0 && <OpsBadge kind="dangerous">{s.blocked_attempts} blocked attempts</OpsBadge>}
      </div>

      {/* Quick actions */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" onClick={() => onImpersonate(p.user_id, p.email || "")}>
          <Eye className="w-3.5 h-3.5 mr-1.5" /> Impersonate
        </Button>
        <Button size="sm" variant="outline" onClick={() => onOpenChat(p.user_id)}>
          <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Open chat
        </Button>
      </div>

      {/* Tier change */}
      <section className="mt-5">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Subscription</h3>
        <div className="flex items-center gap-2">
          <Select defaultValue={p.subscription_tier} onValueChange={(v) => onChangeTier(p.user_id, v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="elite">Elite</SelectItem>
              <SelectItem value="infinity">Infinity</SelectItem>
            </SelectContent>
          </Select>
          <OpsHint>Changing tier updates entitlements immediately. Doesn't issue refunds.</OpsHint>
        </div>
      </section>

      {/* Signals grid */}
      <section className="mt-5">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Signals</h3>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Wallet balance" value={`${s.wallet_balance}`} icon={WalletIcon} />
          <Stat label="Searches" value={`${p.search_count ?? 0}`} icon={Activity} />
          <Stat label="Paid orders" value={`${s.paid_orders}`} sub={s.total_paid ? `₹${s.total_paid.toFixed(0)} total` : undefined} />
          <Stat label="Failed orders" value={`${s.failed_orders}`} tone={s.failed_orders ? "warn" : undefined} />
          <Stat label="Telegram" value={s.telegram_chat_id ? "Linked" : "—"} sub={s.telegram_username ? `@${s.telegram_username}` : undefined} icon={Bot} />
          <Stat label="Last paid" value={fmtRelative(s.last_paid_at)} />
          <Stat label="Last active" value={fmtRelative(s.telegram_last_active_at)} />
          <Stat label="Joined" value={new Date(p.created_at).toLocaleDateString()} sub={fmtRelative(p.created_at)} />
        </div>
      </section>

      {/* Profile */}
      <section className="mt-5">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Profile</h3>
        <dl className="text-xs space-y-1.5">
          <Row label="User ID" value={<code className="text-[10px]">{p.user_id}</code>} />
          <Row label="Phone" value={p.phone || "—"} />
          <Row label="Bio" value={p.bio || "—"} />
          <Row label="Resume" value={p.resume_url
            ? <OperatorLink to={p.resume_url} newTab className="text-primary hover:underline">View ↗</OperatorLink>
            : "—"} />
          <Row label="Signup source" value={s.signup_source || "—"} />
        </dl>
      </section>

      {/* Danger zone */}
      <section className="mt-6 rounded-lg border border-destructive/20 bg-destructive/5">
        <button
          onClick={() => setShowDanger((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-destructive"
        >
          <span className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" /> Danger zone</span>
          <span className="text-[10px] opacity-70">{showDanger ? "Hide" : "Show"}</span>
        </button>
        {showDanger && (
          <DangerZone p={p} s={s} onDelete={onDelete} />
        )}
      </section>
    </>
  );
}

function DangerZone({
  p, s, onDelete,
}: {
  p: ProfileLike;
  s: import("@/lib/admin/users-intel").UserSignals;
  onDelete: (id: string, email: string) => any;
}) {
  type DialogKey = null | "suspend" | "unsuspend" | "logout" | "credits" | "refund" | "delete";
  const [open, setOpen] = useState<DialogKey>(null);
  const [newBalance, setNewBalance] = useState<string>(String(s.wallet_balance ?? 0));
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundOrder, setRefundOrder] = useState<string>("");
  const isSuspended = !!p.suspended_at;

  return (
    <div className="px-4 pb-4 space-y-3">
      <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <ShieldOff className="w-3.5 h-3.5 mt-0.5 shrink-0 text-destructive" />
        <span>
          Every action requires a typed confirmation phrase, a reason ≥6 chars, and is recorded in the operator audit log
          with your identity. Suspension and force-logout are reversible; credit resets are not.
        </span>
      </div>

      {isSuspended && (
        <div className="text-[11px] rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-300 px-2.5 py-1.5">
          Currently suspended{p.suspended_reason ? <> — <em>"{p.suspended_reason}"</em></> : ""}.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {isSuspended ? (
          <Button variant="outline" size="sm" onClick={() => setOpen("unsuspend")}>
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Unsuspend
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setOpen("suspend")}>
            <Ban className="w-3.5 h-3.5 mr-1.5" /> Suspend
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setOpen("logout")}>
          <LogOut className="w-3.5 h-3.5 mr-1.5" /> Force logout
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOpen("credits")}>
          <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Reset credits
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOpen("refund")}>
          <Receipt className="w-3.5 h-3.5 mr-1.5" /> Request refund
        </Button>
      </div>

      <Button variant="destructive" size="sm" className="w-full" onClick={() => setOpen("delete")}>
        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete account
      </Button>

      {/* Suspend */}
      <DangerActionDialog
        open={open === "suspend"} onOpenChange={(o) => setOpen(o ? "suspend" : null)}
        title={`Suspend ${p.email || "user"}`}
        description="The user will be unable to sign in or use the platform until unsuspended. All data is preserved."
        effects={["Active sessions are revoked immediately", "Profile data, wallet, and history are kept intact", "Reversible by Unsuspend"]}
        confirmPhrase="SUSPEND"
        actionLabel="Suspend user"
        onConfirm={async (reason) => {
          const r = await suspendUser(p.user_id, p.email || "", reason);
          if (r.ok) return undefined; return (r as any).error;
        }}
      />

      {/* Unsuspend */}
      <DangerActionDialog
        open={open === "unsuspend"} onOpenChange={(o) => setOpen(o ? "unsuspend" : null)}
        title={`Unsuspend ${p.email || "user"}`}
        description="The user will regain full platform access on next login."
        effects={["Suspension flag and reason cleared", "User must sign in again to obtain a fresh session"]}
        confirmPhrase="UNSUSPEND"
        actionLabel="Unsuspend user"
        actionVariant="default"
        onConfirm={async (reason) => {
          const r = await unsuspendUser(p.user_id, p.email || "", reason);
          if (r.ok) return undefined; return (r as any).error;
        }}
      />

      {/* Force logout */}
      <DangerActionDialog
        open={open === "logout"} onOpenChange={(o) => setOpen(o ? "logout" : null)}
        title={`Force logout ${p.email || "user"}`}
        description="Revokes every active session and refresh token for this user. They can sign back in immediately."
        effects={["No data is changed", "Telegram link / OAuth grants remain", "Useful after credential leak suspicion"]}
        confirmPhrase="LOGOUT"
        actionLabel="Revoke sessions"
        onConfirm={async (reason) => {
          const r = await forceLogoutUser(p.user_id, p.email || "", reason);
          if (r.ok) return undefined; return (r as any).error;
        }}
      />

      {/* Reset credits */}
      <DangerActionDialog
        open={open === "credits"} onOpenChange={(o) => { if (!o) setNewBalance(String(s.wallet_balance ?? 0)); setOpen(o ? "credits" : null); }}
        title={`Reset credits for ${p.email || "user"}`}
        description="Sets the wallet balance to an explicit value. The delta is recorded as an admin_adjustment transaction."
        effects={[
          `Current balance: ${s.wallet_balance ?? 0}`,
          "Wallet transaction row is created with your operator identity",
          "Not reversible — to undo, reset again to the previous value",
        ]}
        confirmPhrase="RESET"
        actionLabel="Apply new balance"
        extraFields={
          <div className="space-y-1.5">
            <Label htmlFor="new-balance" className="text-xs">New balance</Label>
            <Input
              id="new-balance" type="number" min={0} step="0.01"
              value={newBalance} onChange={(e) => setNewBalance(e.target.value)}
              className="text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              Delta: <span className={cn("font-semibold", Number(newBalance) - (s.wallet_balance ?? 0) >= 0 ? "text-emerald-500" : "text-amber-400")}>
                {(Number(newBalance) - (s.wallet_balance ?? 0)).toFixed(2)}
              </span>
            </p>
          </div>
        }
        onConfirm={async (reason) => {
          const v = Number(newBalance);
          if (!Number.isFinite(v) || v < 0) return "Enter a valid balance (≥ 0)";
          const r = await resetCredits(p.user_id, p.email || "", v, s.wallet_balance ?? 0, reason);
          if (r.ok) return undefined; return (r as any).error;
        }}
      />

      {/* Refund request */}
      <DangerActionDialog
        open={open === "refund"} onOpenChange={(o) => { if (!o) { setRefundAmount(""); setRefundOrder(""); } setOpen(o ? "refund" : null); }}
        title={`Open refund request for ${p.email || "user"}`}
        description="Files a refund ticket in the operator workflow. No payment-gateway call is made yet — Dodo refund execution will be wired in a later phase."
        effects={["Status starts as 'pending'", "Visible in Refunds queue for review", "Audit entry includes amount + order id"]}
        confirmPhrase="REFUND"
        actionLabel="File refund request"
        actionVariant="default"
        extraFields={
          <div className="space-y-2">
            <div className="space-y-1.5">
              <Label htmlFor="refund-amount" className="text-xs">Amount (INR)</Label>
              <Input id="refund-amount" type="number" min={0} step="0.01"
                value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)}
                className="text-xs font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="refund-order" className="text-xs">Order / payment ID (optional)</Label>
              <Input id="refund-order" value={refundOrder} onChange={(e) => setRefundOrder(e.target.value)}
                placeholder="dodo_xxx / order_xxx" className="text-xs font-mono" />
            </div>
          </div>
        }
        onConfirm={async (reason) => {
          const amt = Number(refundAmount);
          if (!Number.isFinite(amt) || amt <= 0) return "Enter a valid amount > 0";
          const r = await requestRefund(p.user_id, p.email || "", {
            amount: amt, currency: "INR", orderId: refundOrder.trim() || undefined, reason,
          });
          if (r.ok) return undefined; return (r as any).error;
        }}
      />

      {/* Delete (existing) */}
      <DangerActionDialog
        open={open === "delete"} onOpenChange={(o) => setOpen(o ? "delete" : null)}
        title={`Delete ${p.email || "this user"}`}
        description="Permanently removes the profile and breaks any linked auth session. Billing records are retained for compliance."
        effects={["Profile + linked rows removed", "Wallet balance forfeited", "Cannot be undone — prefer Suspend if uncertain"]}
        confirmPhrase="DELETE"
        actionLabel="Delete account"
        onConfirm={async (_reason) => {
          await onDelete(p.user_id, p.email || "");
        }}
      />
    </div>
  );
}

function Stat({ label, value, sub, icon: Icon, tone }: { label: string; value: string; sub?: string; icon?: any; tone?: "warn" }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div className={cn("text-sm font-semibold tabular-nums mt-0.5", tone === "warn" && "text-amber-400")}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">{value}</dd>
    </div>
  );
}
