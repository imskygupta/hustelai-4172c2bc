import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUnlockSummary, useUnlockPacks } from "@/lib/unlocks/hooks";
import { purchaseUnlockPack, hoursUntilDailyReset } from "@/lib/unlocks/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Zap, HardDrive, Sparkles, Clock, ArrowRight, Wallet as WalletIcon, Crown } from "lucide-react";
import { toast } from "sonner";
import { useCapability } from "@/lib/usage/hooks";

const METER_META: Record<string, { label: string; unit: string; icon: any }> = {
  lightweight: { label: "Lightweight tools", unit: "runs", icon: Sparkles },
  export: { label: "PDF exports", unit: "exports", icon: Zap },
  storage: { label: "HustleAI Cloud storage", unit: "MB", icon: HardDrive },
};

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

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={WalletIcon}
        title="Wallet & unlocks"
        description="Boost packs run alongside your subscription. Unused units roll over."
      >
        <div className="rounded-xl border bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-transparent p-5 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Daily reset</p>
              <p className="font-display text-lg font-semibold flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-500" /> in {resetIn}h
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/pricing"><Crown className="h-3.5 w-3.5 mr-1.5" /> Compare plans</Link>
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          {Object.entries(METER_META).map(([meter, meta]) => {
            const total = balances.filter((b) => b.meter === meter).reduce((a, b) => a + b.remaining, 0);
            const Icon = meta.icon;
            return (
              <div key={meter} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{meta.label}</span>
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className="font-display text-2xl font-semibold mt-1">
                  {loading ? "…" : total.toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground">{meta.unit} unlocked</p>
              </div>
            );
          })}
        </div>

        {/* Storage gauge — branded as HustleAI Cloud */}
        {storageCap.max > 0 && (
          <div className="rounded-xl border bg-card p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">HustleAI Cloud storage</p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {storageCap.tier?.toString().toUpperCase()} plan
              </Badge>
            </div>
            <Progress value={0} className="h-2" />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              0 / {(storageCap.max / 1024).toFixed(1)} GB used · boost with a Cloud pack
            </p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-medium">Active balances</p>
          {loading ? (
            <Skeleton className="h-16 rounded-md" />
          ) : balances.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No active unlocks. Buy a pack below to get started.</p>
          ) : (
            <ul className="rounded-lg border divide-y">
              {balances.map((b, i) => {
                const meta = METER_META[b.meter] ?? { label: b.meter, unit: "units", icon: Zap };
                const Icon = meta.icon;
                return (
                  <li key={i} className="flex items-center justify-between p-3 text-sm">
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{meta.label}</span>
                      {b.feature !== "*" && <Badge variant="outline" className="text-[10px]">{b.feature}</Badge>}
                      {b.expires_at && (
                        <span className="text-[10px] text-amber-600">
                          expires {new Date(b.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {b.remaining.toLocaleString()} {meta.unit}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        icon={Sparkles}
        title="Unlock packs"
        description="One-time purchases. Unused units roll over to next day."
      >
        {packsLoading ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {packs.map((p) => (
              <button
                key={p.id}
                onClick={() => buy(p.key)}
                disabled={!!busy}
                className="text-left rounded-xl border bg-card hover:bg-accent/30 hover:border-primary/40 transition p-4 disabled:opacity-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{p.label}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{p.description}</p>
                    {p.validity_hours && (
                      <Badge variant="outline" className="mt-2 text-[10px]">
                        Valid {Math.round(p.validity_hours / 24) || 1}d
                      </Badge>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-lg font-semibold">₹{p.price_inr}</p>
                    <p className="text-[10px] text-muted-foreground">one-time</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        icon={Clock}
        title="Recent activity"
        description="Last 30 ledger entries — purchases, usage, grants."
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