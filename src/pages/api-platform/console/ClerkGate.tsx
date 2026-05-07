import { ReactNode, useEffect, useState } from "react";
import { ClerkProvider } from "@clerk/clerk-react";
import { ConsoleErrorBoundary } from "./ConsoleErrorBoundary";
import { Loader2, AlertTriangle } from "lucide-react";

const CLERK_PUBLISHABLE_KEY = "pk_live_Y2xlcmsuYXBwLmh1c3RsYWlhcHAuaW4k";
// NOTE: real key (pk_live_Y2xlcmsuYXBpLmh1c3RsYWlhcHAuaW4k) points at
// clerk.api.hustlaiapp.in which currently returns ERR_CONNECTION_CLOSED.
// We keep the canonical key but wrap it in a timeout fallback so the page
// never goes blank.
const REAL_KEY = "pk_live_Y2xlcmsuYXBpLmh1c3RsYWlhcHAuaW4k";
const LOAD_TIMEOUT_MS = 8000;

function ConsoleLoadingScreen() {
  return (
    <div className="min-h-screen bg-[#05070a] text-zinc-300 grid place-items-center px-6">
      <div className="text-center space-y-4">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400 mx-auto" />
        <div className="text-[13px] text-zinc-400">Authentication services are loading…</div>
        <div className="text-[11px] text-zinc-600">HustleAI Console</div>
      </div>
    </div>
  );
}

function ConsoleAuthDownScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-[#05070a] text-zinc-200 grid place-items-center px-6">
      <div className="max-w-md w-full text-center space-y-5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-8">
        <div className="mx-auto h-12 w-12 rounded-xl grid place-items-center bg-amber-500/10 ring-1 ring-amber-500/30">
          <AlertTriangle className="h-6 w-6 text-amber-400" />
        </div>
        <h1 className="text-lg font-semibold text-white">Authentication is taking longer than usual</h1>
        <p className="text-[13px] text-zinc-400">
          We can&apos;t reach the auth service right now. You can retry, or browse public surfaces while we recover.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <button
            onClick={onRetry}
            className="rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold px-4 py-2"
          >
            Retry
          </button>
          <a
            href="https://api.hustlaiapp.in"
            className="rounded-md ring-1 ring-white/10 hover:ring-white/20 text-xs px-4 py-2 text-zinc-300"
          >
            API marketing
          </a>
          <a
            href="https://docs.hustlaiapp.in"
            className="rounded-md ring-1 ring-white/10 hover:ring-white/20 text-xs px-4 py-2 text-zinc-300"
          >
            Docs
          </a>
          <a
            href="https://status.hustlaiapp.in"
            className="rounded-md ring-1 ring-white/10 hover:ring-white/20 text-xs px-4 py-2 text-zinc-300"
          >
            Status
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Wraps console subtree in:
 *   ErrorBoundary → ClerkProvider → children
 * with a hard timeout fallback so the console NEVER renders a blank white
 * screen if Clerk JS fails to load.
 */
export function ClerkGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"booting" | "ready" | "down">("booting");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setState("booting");
    const timer = window.setTimeout(() => {
      // If Clerk hasn't attached its global by now, mark as down.
      if (!(window as any).Clerk) setState("down");
    }, LOAD_TIMEOUT_MS);

    const interval = window.setInterval(() => {
      if ((window as any).Clerk?.loaded) {
        setState("ready");
        window.clearTimeout(timer);
        window.clearInterval(interval);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [retryKey]);

  if (state === "down") {
    return <ConsoleAuthDownScreen onRetry={() => { setRetryKey((k) => k + 1); window.location.reload(); }} />;
  }

  return (
    <ConsoleErrorBoundary key={retryKey}>
      <ClerkProvider publishableKey={REAL_KEY || CLERK_PUBLISHABLE_KEY}>
        {state === "booting" ? <ConsoleLoadingScreen /> : null}
        <div style={{ display: state === "ready" ? "block" : "none" }}>
          {children}
        </div>
      </ClerkProvider>
    </ConsoleErrorBoundary>
  );
}