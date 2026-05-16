import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUnlockSummary, useUnlockPacks } from "@/lib/unlocks/hooks";
import { purchaseUnlockPack, hoursUntilDailyReset } from "@/lib/unlocks/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { SettingsSection } from "@/components/settings/SettingsSection";
import {
  Send, FileDown, Sparkles, HardDrive, Rocket, Clock,
  ArrowRight, Activity, HardDriveDownload, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useCapability } from "@/lib/usage/hooks";
import type { UnlockPack } from "@/lib/unlocks/types";

/**
 * Wallet & unlocks — the operational expansion layer.
 *
 * Subscriptions = baseline infrastructure (capability tiers, memory, AI).
 * Wallet boosts = temporary operational bandwidth — delivery, exports,
 * AI overflow, storage. NEVER framed as coins or credits. Calm cards,
 * operational language, expiry/rollover hints. Surfaced here only —
 * not on the pricing or upgrade pages.
 */

type Category = "delivery" | "export" | "ai" | "burst" | "storage";

const METER_META: Record<string, { label: string; unit: string; icon: any }> = {
  lightweight: { label: "AI workflow runs", unit: "runs", icon: Sparkles },
  export:      { label: "Export deliveries", unit: "exports", icon: FileDown },
  delivery:    { label: "Telegram deliveries", unit: "sends", icon: Send },
  burst:       { label: "Operator burst windows", unit: "active", icon: Rocket },
  storage:     { label: "HustleAI Cloud storage", unit: "MB", icon: HardDrive },
  ai_overflow: { label: "AI overflow capacity", unit: "runs", icon: Activity },
};

const CATEGORY_META: Record<Category, { title: string; tagline: string; icon: any }> = {
  delivery: {
    title: "Telegram delivery boosts",
    tagline: "Extra send capacity for client deliveries and exports.",
    icon: Send,
  },
  export: {
    title: "Export boosts",
    tagline: "Additional branded PDF exports when a launch week needs more.",
    icon: FileDown,
  },
  ai: {
    title: "AI overflow packs",
    tagline: "Temporary additional AI workflow executions across tools.",
    icon: Sparkles,
  },
  burst: {
    title: "Operator burst",
    tagline: "Short windows of unlimited operational throughput.",
    icon: Rocket,
  },
  storage: {
    title: "Workspace storage",
    tagline: "Expand operational storage for documents and exports.",
    icon: HardDriveDownload,
  },
};

/** Map a DB pack into one of the operational categories. */
function categorize(p: UnlockPack): Category {
  if (p.meter === "delivery") return "delivery";
  if (p.meter === "export") return "export";
  if (p.meter === "storage") return "storage";
  if (p.meter === "burst") return "burst";
  if (p.meter === "lightweight" && p.validity_hours && p.validity_hours <= 48) return "burst";
  return "ai";
}

const REASON_LABEL: Record<string, string> = {
  purchase: "Purchase",
  consume: "Used",
  grant: "Granted",
  expire: "Expired",
  rollover: "Rollover",
  promo: "Promo",
  referral: "Referral",
};

export default function Wallet() {
  const { user } = useAuth();
  const { summary, loading, refresh } = useUnlockSummary();
  const { packs, loading: packsLoading } = useUnlockPacks();
  const [busy, setBusy] = useState<string | null>(null);
  const [resetIn, setResetIn] = useState(hoursUntilDailyReset());

  // Storage cap from tier limits (lifetime MB)
  const storageCap = useCapability("storage");

  useEffect(() => {
    const id = setInterval(() => setResetIn(hoursUntilDailyReset()), 60_000);
    return () => clearInterval(id);
  }, []);

  async function buy(packKey: string) {
    setBusy(packKey);
    const r = await purchaseUnlockPack(packKey);
    setBusy(null);
    if (r?.checkout_url) window.location.href = r.checkout_url;
    else toast.error(r?.error || "Couldn't start checkout. Please try again.");
  }

  if (!user) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Sign in to view your wallet.</p>
      </div>
    );
  }

  const balances = summary?.balances ?? [];
  const ledger = summary?.recent ?? [];

  const grouped = useMemo(() => {
    const g: Record<Category, UnlockPack[]> = { delivery: [], export: [], ai: [], burst: [], storage: [] };
    for (const p of packs) g[categorize(p)].push(p);
    return g;
  }, [packs]);

  const CATEGORY_ORDER: Category[] = ["delivery", "export", "ai", "burst", "storage"];

  return (
    <div className="space-y-6">
      {/* ── Active balances ─────────────────────────────────────────── */}
      <SettingsSection
        title="Active balances"
        description="Operational throughput currently unlocked on your workspace."
      >
        <div className="rounded-xl border border-border/60 bg-gradient-to-br from-emerald-500/[0.04] via-card to-card p-5 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Daily reset</p>
              <p className="font-display text-lg font-semibold flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-emerald-600" /> in {resetIn}h
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Subscription quotas refresh daily · boosts stack on top
              </p>
            </div>
            <div className="hidden sm:flex h-10 w-10 rounded-xl bg-emerald-500/10 items-center justify-center">
              <Activity className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-16 rounded-md" />
        ) : balances.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 p-5 text-center">
            <p className="text-sm text-muted-foreground">
              No active boosts. Your subscription baseline is handling everything.
            </p>
          </div>
        ) : (
          <ul className="rounded-lg border border-border/60 divide-y divide-border/60 bg-card">
            {balances.map((b, i) => {
              const meta = METER_META[b.meter] ?? { label: b.meter, unit: "units", icon: Zap };
              const Icon = meta.icon;
              return (
                <li key={i} className="flex items-center justify-between p-3 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-7 w-7 rounded-md bg-muted flex items-center justify-center">
                      <Icon className="h-3.5 w-3.5 text-foreground/70" />
                    </span>
                    <span className="font-medium">{meta.label}</span>
                    {b.feature !== "*" && <Badge variant="outline" className="text-[10px]">{b.feature}</Badge>}
                    {b.expires_at && (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                        expires {new Date(b.expires_at).toLocaleDateString()}
                      </Badge>
                    )}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {b.remaining.toLocaleString()} <span className="text-[11px] font-normal text-muted-foreground">{meta.unit}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {/* Cloud storage gauge */}
        {storageCap.max > 0 && (
          <div className="rounded-xl border border-border/60 bg-card p-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">HustleAI Cloud storage</p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {storageCap.tier?.toString().toUpperCase()} baseline
              </Badge>
            </div>
            <Progress value={0} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              0 / {(storageCap.max / 1024).toFixed(1)} GB used · expand with a storage boost below
            </p>
          </div>
        )}
      </SettingsSection>

      {/* ── Operational bandwidth (boost catalog) ──────────────────── */}
      <SettingsSection
        title="Operational bandwidth"
        description="Temporary boosts that expand throughput on demand. Subscription decides capability — boosts decide capacity."
      >
        {packsLoading ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
        ) : (
          <div className="space-y-8">
            {CATEGORY_ORDER.map((cat) => {
              const list = grouped[cat];
              if (!list?.length) return null;
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              return (
                <div key={cat}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-foreground/70" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{meta.title}</h3>
                      <p className="text-[12px] text-muted-foreground">{meta.tagline}</p>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {list.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => buy(p.key)}
                        disabled={!!busy}
                        className="group text-left rounded-xl border border-border/60 bg-card hover:bg-emerald-500/[0.03] hover:border-emerald-500/30 transition p-4 disabled:opacity-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground">{p.label}</p>
                            <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{p.description}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {p.validity_hours ? (
                                <Badge variant="outline" className="text-[10px] gap-1">
                                  <Clock className="h-2.5 w-2.5" />
                                  {p.validity_hours < 48
                                    ? `${p.validity_hours}h window`
                                    : `Valid ${Math.round(p.validity_hours / 24)}d`}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">Rolls over</Badge>
                              )}
                              {p.units > 1 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{p.units.toLocaleString()} {METER_META[p.meter]?.unit ?? "units"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-display text-lg font-semibold text-foreground">₹{p.price_inr}</p>
                            <p className="text-[10px] text-muted-foreground">one-time</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 rounded-lg border border-border/60 bg-muted/30 p-3 text-[11px] text-muted-foreground leading-relaxed">
          Boosts expand operational throughput temporarily — they don't change your plan's capabilities. For capability tiers
          (memory depth, AI concurrency, automation scale), see your subscription.
        </div>
      </SettingsSection>

      {/* ── Recent operational usage ────────────────────────────────── */}
      <SettingsSection
        title="Recent operational usage"
        description="Last 30 ledger entries — purchases, consumption and grants."
      >
        {loading ? (
          <Skeleton className="h-32 rounded-md" />
        ) : ledger.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No activity yet.</p>
        ) : (
          <ul className="rounded-lg border divide-y text-sm">
            {ledger.map((e, i) => (
              <li key={i} className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <p className="font-medium">{REASON_LABEL[e.reason] ?? e.reason}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {METER_META[e.meter]?.label ?? e.meter}
                    {e.feature !== "*" && ` · ${e.feature}`} · {new Date(e.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-medium tabular-nums ${e.delta >= 0 ? "text-emerald-600" : "text-slate-700"}`}>
                    {e.delta >= 0 ? "+" : ""}{e.delta.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">balance {e.balance_after.toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end mt-3">
          <Button variant="ghost" size="sm" onClick={() => refresh()}>Refresh <ArrowRight className="h-3 w-3 ml-1" /></Button>
        </div>
      </SettingsSection>
    </div>
  );
}