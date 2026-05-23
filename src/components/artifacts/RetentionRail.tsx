// Sprint D Phase 9 — surfaces real storage policy (mode, retention, quota)
// to the user. Reads tier from runtime session + Telegram connectivity from
// the same snapshot used by the rest of the app. No fake "cloud storage"
// language; mirrors edge-side resolver.

import { Database, MessageSquare, Infinity, Clock, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useRuntimeSession } from "@/lib/runtime/useRuntimeSession";
import {
  resolveQuota,
  resolveRetention,
  resolveRouting,
  describeRetention,
  describeRouting,
  type Tier,
} from "@/lib/storage/policy";

type Props = { rowCount: number };

export function RetentionRail({ rowCount }: Props) {
  const { snapshot } = useRuntimeSession();
  const [open, setOpen] = useState(false);
  const tier = ((snapshot?.tier as Tier) || "free");
  const tgConnected = !!snapshot?.telegram_chat_id;
  const retention = resolveRetention(tier);
  const quota = resolveQuota(tier);
  const routing = resolveRouting(tier, tgConnected);

  const usage = Math.min(100, Math.round((rowCount / quota.max_continuity_rows) * 100));
  const usageTone =
    usage >= 90 ? "bg-red-500" : usage >= 70 ? "bg-amber-500" : "bg-primary";

  const RouteIcon = routing.storage_mode === "telegram"
    ? MessageSquare
    : routing.storage_mode === "hybrid"
    ? Database
    : Database;

  return (
    <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
        <Cell icon={RouteIcon} label="Storage mode" value={describeRouting(routing)} />
        <Cell
          icon={retention.telegram_ttl_days < 0 ? Infinity : Clock}
          label="Retention"
          value={describeRetention(retention)}
        />
        <div className="flex-1 min-w-[160px]">
          <div className="flex items-center justify-between text-foreground/70">
            <span className="uppercase tracking-wide text-[10px] font-semibold">Continuity slots</span>
            <span className="text-foreground/85 font-medium">
              {rowCount} / {quota.max_continuity_rows}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full ${usageTone} transition-all`} style={{ width: `${usage}%` }} />
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-[11px] text-foreground/70 hover:text-foreground inline-flex items-center gap-1"
          aria-expanded={open}
        >
          How storage works
          <ChevronRight className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} />
        </button>
      </div>
      {open && <StorageExplainer tier={tier} tgConnected={tgConnected} />}
    </div>
  );
}

function Cell({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <div>
        <div className="uppercase tracking-wide text-[10px] font-semibold text-foreground/65">{label}</div>
        <div className="text-foreground/90 font-medium">{value}</div>
      </div>
    </div>
  );
}

function StorageExplainer({ tier, tgConnected }: { tier: Tier; tgConnected: boolean }) {
  return (
    <div className="border-t border-border pt-2 mt-1 text-[12px] text-foreground/75 leading-relaxed space-y-1">
      <p>
        Your exports stay operational through Telegram — that's the durable layer.
        Anything you generate here is delivered there so it survives device changes,
        refreshes, and outages. We keep a continuity index so you can reopen, resend,
        or continue any workflow from this page.
      </p>
      <p>
        {tier === "free" ? (
          <>Free plan: Telegram acts as a <span className="font-medium">temporary cache</span> for 7 days.
            Upgrade for persistent continuity and resumable history.</>
        ) : tier === "infinity" ? (
          <>Infinity plan: continuity is <span className="font-medium">unlimited</span> — exports never expire from Telegram.</>
        ) : (
          <>Your plan keeps continuity persistent — exports stay resumable for the full retention window.</>
        )}
      </p>
      <p className="text-foreground/65">
        Delivery retries are automatic. If a send drifts, our reconciliation worker repairs it without creating duplicates.
        {!tgConnected && (
          <> Connect Telegram in Integrations to activate continuity storage.</>
        )}
      </p>
    </div>
  );
}