import { useUser } from "@clerk/clerk-react";
import { Activity, Gauge, Key, ScrollText } from "lucide-react";

const Stat = ({ icon: Icon, label, value, hint }: any) => (
  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
      <Icon className="h-3.5 w-3.5 text-emerald-400" />
      {label}
    </div>
    <div className="text-[28px] font-semibold text-zinc-100 mt-2 font-mono">{value}</div>
    <div className="text-[12px] text-zinc-500 mt-1">{hint}</div>
  </div>
);

export default function ConsoleOverview() {
  const { user } = useUser();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[22px] font-semibold text-zinc-100">
          Welcome back, {user?.firstName || "developer"}.
        </h1>
        <p className="text-[13px] text-zinc-500 mt-1">
          Live state of your API workspace.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Activity} label="Requests (24h)" value="0" hint="No activity yet" />
        <Stat icon={Gauge} label="p95 latency" value="—" hint="Metering live after first call" />
        <Stat icon={Key} label="Active keys" value="0" hint="Create one in API keys" />
        <Stat icon={ScrollText} label="Errors (24h)" value="0" hint="Below 0.1% target" />
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="text-[13px] text-zinc-300 font-medium">Quickstart</div>
        <pre className="mt-3 rounded-md bg-black/40 border border-white/[0.04] p-4 overflow-x-auto text-[12px] font-mono text-emerald-200">
{`curl -X POST https://api.hustlaiapp.in/v1/proposals \\
  -H "Authorization: Bearer hk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{ "brief": "Landing page redesign for SaaS" }'`}
        </pre>
      </div>
    </div>
  );
}