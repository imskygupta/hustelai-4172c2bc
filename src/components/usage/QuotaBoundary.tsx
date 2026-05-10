// Global error boundary that catches QuotaError and renders an UpgradeSheet.
import React from "react";
import { QuotaError } from "@/lib/usage/guards";
import { UpgradeSheet } from "./UpgradeSheet";

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
    return (
      <>
        {this.props.children}
        <UpgradeSheet
          open={!!this.state.err}
          onOpenChange={(v) => !v && this.setState({ err: null })}
          capability={this.state.err?.capability ?? null}
          used={this.state.err?.used}
          max={this.state.err?.max}
          upgradeTo={this.state.err?.upgradeTier as any}
        />
      </>
    );
  }
}
