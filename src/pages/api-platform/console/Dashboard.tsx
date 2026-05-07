import { useUser } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, BookOpen, Gauge, Key, ShieldCheck } from "lucide-react";

function Card({ title, value, hint, icon: Icon, to }: any) {
  const inner = (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.12] transition-colors h-full">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
        <Icon className="h-3.5 w-3.5 text-emerald-400" />
        {title}
      </div>
      <div className="text-[26px] font-semibold text-zinc-100 mt-2 font-mono">{value}</div>
      <div className="text-[12px] text-zinc-500 mt-1">{hint}</div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function ConsoleDashboard() {
  const { user } = useUser();
  const name = user?.firstName || user?.username || "developer";
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] uppercase tracking-[0.18em] border border-emerald-400/20">
            Console Beta
          </span>
        </div>
        <h1 className="text-[22px] font-semibold text-zinc-100">Welcome back, {name}.</h1>
        <p className="text-[13px] text-zinc-500 mt-1">A snapshot of your API workspace.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card icon={Key} title="API keys" value="0" hint="Create a test key" to="/keys" />
        <Card icon={Gauge} title="Requests (24h)" value="0" hint="Across all keys" to="/usage" />
        <Card icon={Activity} title="p95 latency" value="—" hint="Live after first call" to="/usage" />
        <Card icon={ShieldCheck} title="Provider health" value="OK" hint="All providers nominal" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="text-[13px] text-zinc-300 font-medium">Quickstart</div>
          <pre className="mt-3 rounded-md bg-black/40 border border-white/[0.04] p-4 overflow-x-auto text-[12px] font-mono text-emerald-200">
{`curl -X POST https://api.hustlaiapp.in/v1/proposals \\
  -H "Authorization: Bearer hk_test_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{ "brief": "Landing page redesign for SaaS" }'`}
          </pre>
          <Link
            to="/keys"
            className="inline-flex items-center gap-1.5 mt-4 text-[12.5px] text-emerald-300 hover:text-emerald-200"
          >
            Create your first key <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <a
          href="https://docs.hustlaiapp.in"
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-white/[0.12] transition-colors flex flex-col"
        >
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
            Docs
          </div>
          <div className="text-[15px] text-zinc-100 mt-2 font-medium">API Reference & Guides</div>
          <div className="text-[12px] text-zinc-500 mt-1">
            Endpoints, auth, error codes, webhooks.
          </div>
          <div className="mt-auto pt-4 text-[12px] text-emerald-300 inline-flex items-center gap-1">
            Open docs <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </a>
      </div>
    </div>
  );
}