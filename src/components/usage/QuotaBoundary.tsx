// Global error boundary that catches QuotaError and renders an UpgradeSheet.
import React from "react";
import { QuotaError } from "@/lib/usage/guards";
import { UpgradeSheet } from "./UpgradeSheet";
import { UnlockSheet } from "./UnlockSheet";

type State = { err: QuotaError | null };

export class QuotaBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { err: null };

  componentDidMount() {
    window.addEventListener("unhandledrejection", this.onRejection);
  }
  componentWillUnmount() {
    window.removeEventListener("unhandledrejection", this.onRejection);
  }

  onRejection = (ev: PromiseRejectionEvent) => {
    if (ev.reason instanceof QuotaError) {
      ev.preventDefault();
      this.setState({ err: ev.reason });
    }
  };

  static getDerivedStateFromError(err: any): State | null {
    if (err instanceof QuotaError) return { err };
    return null;
  }

  render() {
    const err = this.state.err;
    const showUnlock = !!err?.unlockable;
    return (
      <>
        {this.props.children}
        <UnlockSheet
          open={!!err && showUnlock}
          onOpenChange={(v) => !v && this.setState({ err: null })}
          capability={err?.capability ?? null}
          used={err?.used}
          max={err?.max}
          upgradeTo={err?.upgradeTier as any}
        />
        <UpgradeSheet
          open={!!err && !showUnlock}
          onOpenChange={(v) => !v && this.setState({ err: null })}
          capability={err?.capability ?? null}
          used={err?.used}
          max={err?.max}
          upgradeTo={err?.upgradeTier as any}
        />
      </>
    );
  }
}
