import { ReactNode, useState, MouseEvent } from "react";
import { Lock, Crown, AlertCircle, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCapability } from "@/lib/usage/hooks";
import { useFeatureFlag } from "@/lib/flags";
import { useTelegramConnection } from "@/lib/usage/useTelegramConnection";
import { UpgradeSheet } from "./UpgradeSheet";
import { CapabilityBadge } from "./CapabilityBadge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

type Variant = "button" | "menu-item" | "icon";

interface Props {
  /** Capability key from CAPABILITIES registry, e.g. "telegram_export" */
  capabilityKey: string;
  /** Optional feature flag gate (kill switch / maintenance) */
  flag?: string;
  /** When true, also requires connected Telegram integration */
  requiresTelegram?: boolean;
  onClick?: (e: MouseEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  children: ReactNode;
  /** Render style */
  variant?: Variant;
  /** Hide instead of showing locked state */
  hideWhenLocked?: boolean;
  /** Override label shown in tooltip when locked */
  lockedLabel?: string;
  icon?: ReactNode;
}

/**
 * Capability-aware action wrapper. Renders an interactive button only when
 * all gates pass (tier, flag, integration). Otherwise renders a disabled
 * locked state that surfaces clear next steps — never a click-to-fail UX.
 */
export function CapabilityAction({
  capabilityKey, flag, requiresTelegram = false,
  onClick, disabled, loading, className, children, variant = "button",
  hideWhenLocked = false, lockedLabel, icon,
}: Props) {
  const cap = useCapability(capabilityKey);
  const flagState = useFeatureFlag(flag || "__noop__");
  const tg = useTelegramConnection();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const navigate = useNavigate();

  const tierLocked = !cap.loading && cap.capability && cap.max === 0;
  const flagBlocked = flag && !flagState.loading && !flagState.enabled;
  const tgMissing = requiresTelegram && !tg.loading && !tg.connected;
  const stillLoading = cap.loading || (flag && flagState.loading) || (requiresTelegram && tg.loading);

  // Pick most informative locked state.
  let locked: null | { kind: "tier" | "flag" | "telegram"; reason: string; cta?: string; ctaHref?: string } = null;
  if (!stillLoading) {
    if (tierLocked) {
      locked = {
        kind: "tier",
        reason: cap.capability?.upgradeCopy || "Upgrade to unlock this action.",
        cta: `Upgrade to ${cap.upgradeTo}`,
      };
    } else if (flagBlocked) {
      locked = {
        kind: "flag",
        reason: flagState.maintenance
          ? (flagState.message || "Temporarily under maintenance.")
          : "This action is currently unavailable.",
      };
    } else if (tgMissing) {
      locked = {
        kind: "telegram",
        reason: "Connect Telegram to receive this delivery.",
        cta: "Connect Telegram",
        ctaHref: "/settings/telegram",
      };
    }
  }

  if (locked && hideWhenLocked) return null;

  const baseBtn =
    variant === "menu-item"
      ? "w-full text-left text-[13px] px-3 py-2 rounded-md flex items-center gap-2"
      : variant === "icon"
      ? "inline-flex items-center justify-center h-8 w-8 rounded-md"
      : "inline-flex items-center gap-1.5 text-[11px] rounded-md ring-1 px-2 py-1.5 transition";

  if (locked) {
    const tip = lockedLabel || locked.reason;
    const lockedClasses = cn(
      baseBtn,
      "bg-muted/40 ring-border text-muted-foreground cursor-not-allowed opacity-80",
      className,
    );
    const handleLockedClick = (e: MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (locked.kind === "tier") setUpgradeOpen(true);
      else if (locked.kind === "telegram" && locked.ctaHref) navigate(locked.ctaHref);
    };
    const Icon = locked.kind === "tier" ? Crown : locked.kind === "telegram" ? AlertCircle : Lock;
    const badge = locked.kind === "tier"
      ? <span className="ml-1 text-[9px] uppercase tracking-wider text-amber-600">{cap.upgradeTo}</span>
      : null;
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={handleLockedClick} className={lockedClasses}>
              {icon || <Icon className="h-3 w-3" />}
              <span>{children}</span>
              {badge}
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[220px] text-[11px]">
            <div className="font-medium mb-0.5">{locked.reason}</div>
            {locked.cta && <div className="text-muted-foreground text-[10px]">Tap to {locked.cta.toLowerCase()}</div>}
          </TooltipContent>
        </Tooltip>
        {locked.kind === "tier" && (
          <UpgradeSheet
            open={upgradeOpen}
            onOpenChange={setUpgradeOpen}
            capability={cap.capability}
            used={0}
            max={cap.max}
            upgradeTo={cap.upgradeTo}
          />
        )}
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading || !!stillLoading}
      className={cn(baseBtn, "bg-muted/40 ring-border text-muted-foreground hover:text-foreground disabled:opacity-30", className)}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : icon}
      <span>{children}</span>
    </button>
  );
}
