import { AlertTriangle } from "lucide-react";

export function RootErrorFallback() {
  return (
    <div className="min-h-screen bg-[#07090d] text-zinc-200 grid place-items-center px-6">
      <div className="max-w-md text-center space-y-5">
        <div className="mx-auto h-14 w-14 rounded-2xl grid place-items-center bg-amber-500/10 ring-1 ring-amber-500/30">
          <AlertTriangle className="h-7 w-7 text-amber-400" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Something went sideways
        </h1>
        <p className="text-sm text-zinc-400">
          A part of HustleAI crashed unexpectedly. The rest of the platform is unaffected.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold px-4 py-2"
          >
            Reload
          </button>
          <a
            href="https://hustlaiapp.in"
            className="rounded-md ring-1 ring-white/10 hover:ring-white/20 text-xs px-4 py-2 text-zinc-300"
          >
            Go home
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