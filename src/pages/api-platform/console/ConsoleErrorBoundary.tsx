import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface State {
  hasError: boolean;
  message?: string;
}

/**
 * Catches any crash inside ClerkProvider / console tree so the console
 * subdomain never renders a blank white screen.
 */
export class ConsoleErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err?.message || "Unknown error" };
  }

  componentDidCatch(err: Error) {
    console.error("[Console] crash:", err);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen bg-[#05070a] text-zinc-200 grid place-items-center px-6">
        <div className="max-w-md w-full text-center space-y-5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-8">
          <div className="mx-auto h-12 w-12 rounded-xl grid place-items-center bg-amber-500/10 ring-1 ring-amber-500/30">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
          </div>
          <h1 className="text-xl font-semibold text-white">Console unavailable</h1>
          <p className="text-[13px] text-zinc-400">
            Authentication services failed to initialize. The rest of HustleAI is unaffected.
          </p>
          <p className="text-[11px] font-mono text-zinc-500 break-words">{this.state.message}</p>
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold px-4 py-2"
            >
              Retry
            </button>
            <a
              href="https://api.hustlaiapp.in"
              className="rounded-md ring-1 ring-white/10 hover:ring-white/20 text-xs px-4 py-2 text-zinc-300"
            >
              Back to API site
            </a>
            <a
              href="https://status.hustlaiapp.in"
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Status
            </a>
          </div>
        </div>
      </div>
    );
  }
}