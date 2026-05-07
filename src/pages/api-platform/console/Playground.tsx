import { useState } from "react";
import { Play } from "lucide-react";

export default function ConsolePlayground() {
  const [endpoint, setEndpoint] = useState("/v1/proposals");
  const [body, setBody] = useState('{\n  "brief": "Landing page for SaaS"\n}');
  const [response, setResponse] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResponse("");
    // Stub: real call wired once API gateway is live.
    setTimeout(() => {
      setResponse(JSON.stringify({ ok: true, endpoint, echo: JSON.parse(body || "{}") }, null, 2));
      setLoading(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-zinc-100">Playground</h1>
        <p className="text-[13px] text-zinc-500 mt-1">Try API endpoints without leaving the console.</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
          <label className="block text-[11px] uppercase tracking-[0.18em] text-zinc-500">Endpoint</label>
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className="w-full bg-black/40 border border-white/[0.06] rounded-md px-3 py-2 text-[13px] font-mono text-zinc-100"
          />
          <label className="block text-[11px] uppercase tracking-[0.18em] text-zinc-500">Request body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="w-full bg-black/40 border border-white/[0.06] rounded-md px-3 py-2 text-[12.5px] font-mono text-zinc-100"
          />
          <button
            onClick={run}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold px-4 py-2 disabled:opacity-60"
          >
            <Play className="h-3.5 w-3.5" /> {loading ? "Running…" : "Run"}
          </button>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Response</div>
          <pre className="text-[12px] font-mono text-emerald-200 whitespace-pre-wrap min-h-[260px]">
{response || "// Response will appear here"}
          </pre>
        </div>
      </div>
    </div>
  );
}