export default function ConsoleLogs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-zinc-100">Request logs</h1>
        <p className="text-[13px] text-zinc-500 mt-1">Last 7 days of requests across all endpoints.</p>
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2.5 text-[10.5px] uppercase tracking-[0.18em] text-zinc-500 border-b border-white/[0.06] font-mono">
          <div className="col-span-2">Time</div>
          <div className="col-span-3">Endpoint</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2">Latency</div>
          <div className="col-span-2">Tokens</div>
          <div className="col-span-2">Key</div>
        </div>
        <div className="p-10 text-center text-[13px] text-zinc-500">No requests in window.</div>
      </div>
    </div>
  );
}