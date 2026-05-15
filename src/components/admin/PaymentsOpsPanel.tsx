import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { OperatorHeader, OperatorChips, OperatorEmpty, OperatorExplainer, OperatorCard, OperatorKpi } from "./OperatorScaffold";
import { OpsBadge } from "./OpsBadge";
import { CreditCard, Search, ChevronRight, Activity, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaymentMethodsManager } from "@/components/admin/PaymentMethodsManager";

type ProfileLike = { user_id: string; email: string | null; display_name: string | null };
type Filter = "all" | "paid" | "pending" | "failed" | "refunded";

function fmtAmount(amount: number, currency = "INR") {
  if (currency === "INR") return `₹${amount.toLocaleString()}`;
  return `${currency} ${amount.toLocaleString()}`;
}

function statusTone(status: string) {
  if (status === "paid" || status === "completed" || status === "success") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  if (status === "pending" || status === "initiated") return "bg-amber-500/10 text-amber-400 border-amber-500/30";
  if (status === "failed" || status === "cancelled") return "bg-destructive/10 text-destructive border-destructive/30";
  if (status === "refunded") return "bg-violet-500/10 text-violet-300 border-violet-500/30";
  return "bg-muted text-muted-foreground border-border";
}

export function PaymentsOpsPanel({
  payments, users,
}: {
  payments: any[];
  users: ProfileLike[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [openPayment, setOpenPayment] = useState<any | null>(null);

  const counts = useMemo(() => {
    const c = { all: payments.length, paid: 0, pending: 0, failed: 0, refunded: 0, revenue: 0 };
    payments.forEach((p) => {
      if (p.status === "paid" || p.status === "completed" || p.status === "success") {
        c.paid++;
        c.revenue += Number(p.amount || 0);
      } else if (p.status === "pending" || p.status === "initiated") c.pending++;
      else if (p.status === "failed" || p.status === "cancelled") c.failed++;
      else if (p.status === "refunded") c.refunded++;
    });
    return c;
  }, [payments]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments.filter((p) => {
      if (filter !== "all") {
        const matches =
          (filter === "paid" && (p.status === "paid" || p.status === "completed" || p.status === "success")) ||
          (filter === "pending" && (p.status === "pending" || p.status === "initiated")) ||
          (filter === "failed" && (p.status === "failed" || p.status === "cancelled")) ||
          (filter === "refunded" && p.status === "refunded");
        if (!matches) return false;
      }
      if (!q) return true;
      const u = users.find((x) => x.user_id === p.user_id);
      const hay = [p.order_id, p.plan, u?.display_name, u?.email, p.user_id].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [payments, users, filter, query]);

  return (
    <div className="space-y-4">
      <PaymentMethodsManager />
      <OperatorHeader icon={CreditCard} title="Payments" count={`${counts.all} total`} badges={[{ kind: "production" }]} />
      <OperatorExplainer
        title="Investigation tip"
        badges={counts.failed > 0 ? [{ kind: "dangerous", label: `${counts.failed} failed` }] : undefined}
      >
        Click any row to open the payment timeline drawer — it shows lifecycle events from the gateway and helps trace why a charge failed. Refund flows are <strong>not</strong> wired here yet; mark a row as refunded only after refunding inside the gateway dashboard.
      </OperatorExplainer>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <OperatorKpi label="Revenue" value={fmtAmount(counts.revenue)} sub={`${counts.paid} paid`} tone="good" />
        <OperatorKpi label="Successful" value={counts.paid} tone="good" />
        <OperatorKpi label="Pending" value={counts.pending} tone={counts.pending ? "warn" : undefined} />
        <OperatorKpi label="Failed" value={counts.failed} tone={counts.failed ? "bad" : undefined} />
        <OperatorKpi label="Refunded" value={counts.refunded} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <OperatorChips<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { key: "all", label: "All", count: counts.all },
            { key: "paid", label: "Paid", count: counts.paid },
            { key: "pending", label: "Pending", count: counts.pending },
            { key: "failed", label: "Failed", count: counts.failed },
            { key: "refunded", label: "Refunded", count: counts.refunded },
          ]}
        />
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by order id, user, plan…" className="pl-9 h-8 text-sm" />
        </div>
      </div>

      <OperatorCard className="overflow-hidden">
        <div className="grid grid-cols-[140px_minmax(0,1.4fr)_90px_100px_110px_minmax(0,0.9fr)_56px] items-center gap-3 px-4 py-2 border-b border-border/60 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div>Order</div><div>User</div><div>Plan</div><div className="text-right">Amount</div><div>Status</div><div>Date</div><div></div>
        </div>
        {list.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">No payments match.</div>}
        {list.map((p) => {
          const u = users.find((x) => x.user_id === p.user_id);
          return (
            <button
              key={p.id}
              onClick={() => setOpenPayment(p)}
              className="w-full grid grid-cols-[140px_minmax(0,1.4fr)_90px_100px_110px_minmax(0,0.9fr)_56px] items-center gap-3 px-4 py-2.5 text-left border-b border-border/30 last:border-0 hover:bg-muted/40 transition"
            >
              <div className="text-[11px] font-mono truncate">{p.order_id || p.id.slice(0, 10)}</div>
              <div className="min-w-0">
                <div className="text-sm truncate">{u?.display_name || u?.email || (p.user_id || "").slice(0, 8)}</div>
                <div className="text-[10px] text-muted-foreground truncate">{u?.email}</div>
              </div>
              <div><span className="text-[10px] uppercase tracking-wider rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground">{p.plan || "—"}</span></div>
              <div className="text-right text-sm tabular-nums">{fmtAmount(Number(p.amount || 0), p.currency || "INR")}</div>
              <div>
                <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wider", statusTone(p.status))}>
                  {p.status}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground truncate">{new Date(p.created_at).toLocaleString()}</div>
              <div className="text-right text-muted-foreground"><ChevronRight className="w-4 h-4 inline" /></div>
            </button>
          );
        })}
      </OperatorCard>

      <Sheet open={!!openPayment} onOpenChange={(o) => !o && setOpenPayment(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {openPayment && <PaymentDrawer p={openPayment} user={users.find((x) => x.user_id === openPayment.user_id)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PaymentDrawer({ p, user }: { p: any; user?: ProfileLike }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      // Load lifecycle events from dodo_events scoped to this user (best available signal).
      const { data } = await (supabase as any)
        .from("dodo_events")
        .select("id, event_type, status, error, created_at, payload")
        .eq("user_id", p.user_id)
        .order("created_at", { ascending: false })
        .limit(40);
      if (alive) { setEvents(data || []); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [p.user_id]);

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> Payment {p.order_id || p.id.slice(0, 10)}</SheetTitle>
        <SheetDescription className="sr-only">Payment lifecycle and gateway events</SheetDescription>
      </SheetHeader>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <OperatorKpi label="Amount" value={`₹${Number(p.amount || 0).toLocaleString()}`} />
        <OperatorKpi label="Plan" value={p.plan || "—"} />
        <OperatorKpi
          label="Status"
          value={p.status}
          tone={p.status === "paid" || p.status === "completed" ? "good" : p.status === "failed" ? "bad" : "warn"}
        />
        <OperatorKpi label="Currency" value={p.currency || "INR"} />
      </div>
      <div className="mt-4 text-xs space-y-1.5">
        <Row label="User" value={<span>{user?.display_name || user?.email || p.user_id?.slice(0, 8)}</span>} />
        <Row label="Email" value={user?.email || "—"} />
        <Row label="Order id" value={<code className="text-[10px]">{p.order_id || p.id}</code>} />
        <Row label="Created" value={new Date(p.created_at).toLocaleString()} />
      </div>

      <div className="mt-5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" /> Webhook timeline
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          <OpsBadge kind="internal">Read-only</OpsBadge>
        </div>
        {events.length === 0 && !loading ? (
          <div className="text-xs text-muted-foreground py-4 inline-flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            No gateway events for this user. Check the gateway dashboard if a charge is missing.
          </div>
        ) : (
          <ol className="space-y-2 border-l border-border/50 pl-3">
            {events.map((e) => (
              <li key={e.id} className="text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wider", statusTone(e.status))}>
                    {e.status}
                  </span>
                  <span className="font-medium">{e.event_type}</span>
                  <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                </div>
                {e.error && <div className="mt-1 text-[11px] text-destructive">{e.error}</div>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-words">{value}</span>
    </div>
  );
}
