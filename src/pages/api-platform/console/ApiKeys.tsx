import { Key, Plus } from "lucide-react";

export default function ConsoleApiKeys() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-zinc-100">API keys</h1>
          <p className="text-[13px] text-zinc-500 mt-1">
            Test and live keys for authenticating requests.
          </p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-500 text-zinc-900 text-[12.5px] font-medium hover:bg-emerald-400">
          <Plus className="h-4 w-4" /> Create key
        </button>
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="p-10 text-center">
          <Key className="h-6 w-6 text-zinc-500 mx-auto" />
          <div className="text-[13px] text-zinc-300 mt-3">No keys yet.</div>
          <div className="text-[12px] text-zinc-500 mt-1">
            Create a test key to start hitting the sandbox.
          </div>
        </div>
      </div>
    </div>
  );
}