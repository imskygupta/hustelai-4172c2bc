import { useEffect, useState } from "react";
import { listPublicEndpoints, type ApiEndpoint } from "@/integrations/api-platform/client";

export default function ConsoleEndpoints() {
  const [rows, setRows] = useState<ApiEndpoint[]>([]);
  useEffect(() => { listPublicEndpoints().then(setRows); }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-zinc-100">Endpoints</h1>
        <p className="text-[13px] text-zinc-500 mt-1">Operational APIs available to your workspace.</p>
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
        {rows.length === 0 && <div className="p-10 text-center text-[13px] text-zinc-500">Loading endpoints…</div>}
        {rows.map((e) => (
          <div key={e.id} className="p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[13px] text-zinc-100 font-medium">{e.name}</div>
              <div className="text-[11.5px] text-zinc-500 mt-0.5 font-mono">
                <span className="text-emerald-400">{e.method}</span> {e.path}
                <span className="text-zinc-600"> · routed via </span>
                <span className="text-zinc-300">{e.model_route}</span>
              </div>
            </div>
            <span className={`text-[10.5px] uppercase tracking-[0.18em] px-2 py-0.5 rounded ${e.status === "ga" ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>{e.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}