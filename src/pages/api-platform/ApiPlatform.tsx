import { useState } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Boxes,
  Cpu,
  Database,
  FileText,
  Gauge,
  Globe,
  Key,
  LineChart,
  Lock,
  Network,
  Shield,
  Sparkles,
  Terminal,
  Webhook,
  Zap,
  Check,
  Copy,
} from "lucide-react";

/* ----------------------------- Tokens ----------------------------- */

const shell = "min-h-screen bg-[#07090d] text-zinc-200 antialiased";
const mono = "font-mono text-[12.5px] leading-relaxed";
const grid =
  "bg-[radial-gradient(circle_at_50%_-10%,hsl(160_84%_39%/0.18),transparent_60%)]";
const card =
  "rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm";
const subtleCard =
  "rounded-lg border border-white/[0.06] bg-white/[0.015]";
const eyebrow =
  "inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-emerald-400/90 font-medium";

/* ----------------------------- Data ----------------------------- */

const APIS = [
  {
    slug: "proposal",
    name: "Proposal Generator",
    method: "POST",
    path: "/v1/proposals",
    desc: "Generate structured client proposals with sectioned output, pricing, and tone control.",
    latency: "412ms",
    model: "Hustle Logic",
    icon: FileText,
  },
  {
    slug: "scope",
    name: "Scope Document",
    method: "POST",
    path: "/v1/scope",
    desc: "Convert briefs into deliverables, timelines, and exclusions with milestone breakdowns.",
    latency: "538ms",
    model: "Hustle Logic",
    icon: Boxes,
  },
  {
    slug: "resume",
    name: "Resume Optimizer",
    method: "POST",
    path: "/v1/resume/optimize",
    desc: "ATS-aware rewriting, keyword scoring, and JD-matched section reordering.",
    latency: "327ms",
    model: "Hustle Fast",
    icon: Sparkles,
  },
  {
    slug: "intake",
    name: "Client Intake Analyzer",
    method: "POST",
    path: "/v1/intake/analyze",
    desc: "Extract scope, budget, urgency, red flags, and qualification score from raw intake forms.",
    latency: "461ms",
    model: "Hustle Omni",
    icon: Database,
  },
  {
    slug: "redflag",
    name: "Red Flag Scanner",
    method: "POST",
    path: "/v1/redflag/scan",
    desc: "Detect risk signals in client messages, contracts, and briefs across 14 risk axes.",
    latency: "289ms",
    model: "Hustle Fast",
    icon: Shield,
  },
] as const;

const MODELS = [
  { name: "Hustle Fast", desc: "Sub-300ms classification & extraction.", best: "intake, scoring, tagging" },
  { name: "Hustle Logic", desc: "Long-form structured generation.", best: "proposals, scopes, contracts" },
  { name: "Hustle Omni", desc: "Multimodal reasoning across text + docs.", best: "audits, summaries, analysis" },
  { name: "Hustle Research", desc: "Deep, citation-grade synthesis.", best: "market scans, deep briefs" },
];

const CURL = `curl -X POST https://api.hustlaiapp.in/v1/proposals \\
  -H "Authorization: Bearer hk_live_2f8a••••9c1d" \\
  -H "Content-Type: application/json" \\
  -d '{
    "client": "Acme Studios",
    "brief": "Rebrand + 6-page marketing site",
    "tone": "confident",
    "model": "hustle-logic"
  }'`;

const JS_SDK = `import { HustleAI } from "@hustlaiapp/sdk";

const hustle = new HustleAI({ apiKey: process.env.HUSTLE_API_KEY });

const proposal = await hustle.proposals.create({
  client: "Acme Studios",
  brief: "Rebrand + 6-page marketing site",
  tone: "confident",
  model: "hustle-logic",
});

console.log(proposal.sections);`;

const SAMPLE_RESPONSE = `{
  "id": "prop_01HXQ7ZK9F3Y",
  "object": "proposal",
  "model": "hustle-logic",
  "latency_ms": 412,
  "sections": [
    { "title": "Project Overview", "body": "..." },
    { "title": "Deliverables",     "items": ["Brand system", "Site"] },
    { "title": "Timeline",         "weeks": 5 },
    { "title": "Investment",       "currency": "INR", "amount": 185000 }
  ],
  "usage": { "tokens_in": 412, "tokens_out": 1204 }
}`;

const PRICING = [
  {
    name: "Developer",
    price: "Free",
    blurb: "For prototypes & local dev.",
    items: ["10K requests / mo", "Hustle Fast model", "Community support", "Test mode keys"],
  },
  {
    name: "Scale",
    price: "$49",
    suffix: "/mo",
    blurb: "For production SaaS workloads.",
    items: ["1M requests / mo", "All models incl. Hustle Logic", "Webhooks + SDKs", "p95 < 600ms SLO", "Email support"],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    blurb: "Volume, white-label, on-prem.",
    items: ["Unlimited volume", "White-label endpoints", "Custom workflows", "Dedicated routing", "99.99% uptime SLA"],
  },
];

const USECASES = [
  { t: "Vertical SaaS", d: "Embed proposal, scope and intake AI into your product without owning the model layer." },
  { t: "Agencies", d: "Automate client onboarding, scoping, and risk review across hundreds of leads." },
  { t: "Job platforms", d: "Score, rewrite and match resumes at scale with Hustle Fast." },
  { t: "CRMs", d: "Detect red flags and qualify leads in real time as they arrive." },
];

/* ----------------------------- Bits ----------------------------- */

function MethodPill({ m }: { m: string }) {
  return (
    <span className="inline-flex h-5 items-center rounded bg-emerald-500/10 px-1.5 text-[10px] font-semibold text-emerald-400 tracking-wider">
      {m}
    </span>
  );
}

function StatusDot() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
    </span>
  );
}

function Code({ children, label }: { children: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#0a0d12]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-rose-400/60" />
          <span className="h-2 w-2 rounded-full bg-amber-400/60" />
          <span className="h-2 w-2 rounded-full bg-emerald-400/60" />
          {label && (
            <span className="ml-2 text-[11px] uppercase tracking-wider text-zinc-500">
              {label}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(children);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="text-[11px] text-zinc-400 hover:text-emerald-400 inline-flex items-center gap-1"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className={`${mono} overflow-x-auto px-4 py-3 text-zinc-300`}>
        <code>{children}</code>
      </pre>
    </div>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function ApiPlatform() {
  const [active, setActive] = useState(0);
  const api = APIS[active];

  return (
    <div className={shell}>
      <SEO
        title="HustleAI API — Operational AI infrastructure for modern SaaS"
        description="Drop-in operational AI APIs: proposals, scopes, resume optimization, intake analysis, red-flag scanning. Built on api.hustlaiapp.in."
        path="/api-platform"
      />

      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07090d]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
              <Terminal className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight text-white">
              HustleAI <span className="text-emerald-400">API</span>
            </span>
            <span className="ml-2 hidden text-[11px] text-zinc-500 sm:inline">
              api.hustlaiapp.in
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
            <a href="#catalog" className="hover:text-white">APIs</a>
            <a href="#playground" className="hover:text-white">Playground</a>
            <a href="#sdks" className="hover:text-white">SDKs</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <Link to="/docs" className="hover:text-white">Docs</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden text-zinc-300 hover:text-white sm:inline-flex" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button size="sm" className="bg-emerald-500 text-black hover:bg-emerald-400" asChild>
              <Link to="/signup">Get API key</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className={`relative ${grid}`}>
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-20 lg:pt-28">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <div className={eyebrow}>
                <StatusDot /> all systems operational · 99.98% uptime
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
                Drop-in operational AI<br />
                for modern SaaS.
              </h1>
              <p className="mt-5 max-w-xl text-base text-zinc-400 md:text-lg">
                The infrastructure layer behind HustleAI Workspace OS — now
                available as a developer API. Built on{" "}
                <span className="text-emerald-400">api.hustlaiapp.in</span>.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button size="lg" className="bg-emerald-500 text-black hover:bg-emerald-400" asChild>
                  <Link to="/signup">
                    Get API key <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white/10 bg-white/[0.02] text-zinc-200 hover:bg-white/[0.05]" asChild>
                  <a href="#playground">Read API reference</a>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-zinc-500">
                <span className="inline-flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5 text-emerald-400" /> p95 412ms</span>
                <span className="inline-flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-emerald-400" /> 99.98% uptime</span>
                <span className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-emerald-400" /> Multi-region</span>
                <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-emerald-400" /> SOC2-ready</span>
                <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-emerald-400" /> OpenAPI 3.1</span>
              </div>
            </div>

            <div className="lg:pl-6">
              <Code label="bash · live request">{CURL}</Code>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className={`${subtleCard} p-3`}>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">p95 latency</div>
                  <div className="mt-1 font-mono text-lg text-emerald-400">412ms</div>
                </div>
                <div className={`${subtleCard} p-3`}>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">requests · 24h</div>
                  <div className="mt-1 font-mono text-lg text-white">1.42M</div>
                </div>
                <div className={`${subtleCard} p-3`}>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">success rate</div>
                  <div className="mt-1 font-mono text-lg text-white">99.98%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="border-y border-white/[0.06] bg-white/[0.015]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            <span>Powered by the HustleAI API layer</span>
            <span className="hidden sm:inline">Built upon the HustleAI API stack</span>
            <span>Operational AI infrastructure</span>
            <span className="hidden md:inline">api.hustlaiapp.in</span>
          </div>
        </div>
      </section>

      {/* API catalog */}
      <section id="catalog" className="mx-auto max-w-7xl px-5 py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <div className={eyebrow}><Network className="h-3 w-3" /> API catalog</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Five production endpoints. One key.
            </h2>
            <p className="mt-2 max-w-xl text-zinc-400">
              Every API is battle-tested in HustleAI Workspace OS — the same
              infrastructure handling thousands of freelancer workflows daily.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {APIS.map((a) => {
            const Icon = a.icon;
            return (
              <div key={a.slug} className={`${card} group p-5 transition hover:border-emerald-500/30`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{a.name}</div>
                      <div className={`${mono} mt-0.5 text-zinc-500`}>
                        <MethodPill m={a.method} /> <span className="ml-1">{a.path}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-[10px] text-emerald-400">
                    {a.model}
                  </Badge>
                </div>
                <p className="mt-4 text-sm text-zinc-400">{a.desc}</p>
                <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="inline-flex items-center gap-1.5"><Gauge className="h-3 w-3 text-emerald-400" /> p95 {a.latency}</span>
                  <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3 w-3" /> OpenAPI-ready</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Playground */}
      <section id="playground" className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <div className="mb-8">
            <div className={eyebrow}><Terminal className="h-3 w-3" /> Playground preview</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Try it in your terminal.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="space-y-1">
              {APIS.map((a, i) => (
                <button
                  key={a.slug}
                  onClick={() => setActive(i)}
                  className={`group flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left text-sm transition ${
                    i === active
                      ? "border-emerald-500/30 bg-emerald-500/5 text-white"
                      : "border-white/[0.06] bg-transparent text-zinc-400 hover:bg-white/[0.03] hover:text-white"
                  }`}
                >
                  <span>{a.name}</span>
                  <MethodPill m={a.method} />
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className={`${mono} text-zinc-400`}>
                  <MethodPill m={api.method} /> <span className="ml-2 text-zinc-300">{api.path}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <Badge variant="outline" className="border-white/10 bg-white/[0.02] text-zinc-400">
                    model: {api.model.toLowerCase().replace(" ", "-")}
                  </Badge>
                  <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
                    p95 {api.latency}
                  </Badge>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Code label="request · curl">{CURL.replace("/v1/proposals", api.path)}</Code>
                <Code label="response · 200 OK">{SAMPLE_RESPONSE}</Code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SDKs + Auth */}
      <section id="sdks" className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className={eyebrow}><Cpu className="h-3 w-3" /> SDK examples</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Typed SDKs. Zero glue code.
            </h2>
            <p className="mt-2 text-zinc-400">
              Official SDKs for TypeScript, Python and Go — generated from our
              OpenAPI 3.1 spec. Drop-in, fully typed, autocompleted.
            </p>
            <div className="mt-6">
              <Code label="typescript · @hustlaiapp/sdk">{JS_SDK}</Code>
            </div>
          </div>

          <div>
            <div className={eyebrow}><Key className="h-3 w-3" /> Authentication</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Bearer keys. Workspace scoped.
            </h2>
            <p className="mt-2 text-zinc-400">
              Issue test &amp; live keys per workspace. Rotate, revoke and scope
              keys to specific endpoints. OAuth and team workspaces ship next.
            </p>
            <div className="mt-6 space-y-3">
              <div className={`${subtleCard} flex items-center justify-between p-4`}>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-zinc-500">Live key</div>
                  <div className={`${mono} mt-1 text-zinc-200`}>hk_live_2f8a••••9c1d</div>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15">active</Badge>
              </div>
              <div className={`${subtleCard} flex items-center justify-between p-4`}>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-zinc-500">Test key</div>
                  <div className={`${mono} mt-1 text-zinc-200`}>hk_test_8ad1••••0e4b</div>
                </div>
                <Badge variant="outline" className="border-white/10 text-zinc-400">test mode</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className={`${subtleCard} p-3 text-center`}>
                  <Webhook className="mx-auto h-4 w-4 text-emerald-400" />
                  <div className="mt-1 text-[11px] text-zinc-400">Webhooks</div>
                </div>
                <div className={`${subtleCard} p-3 text-center`}>
                  <Shield className="mx-auto h-4 w-4 text-emerald-400" />
                  <div className="mt-1 text-[11px] text-zinc-400">OAuth (soon)</div>
                </div>
                <div className={`${subtleCard} p-3 text-center`}>
                  <LineChart className="mx-auto h-4 w-4 text-emerald-400" />
                  <div className="mt-1 text-[11px] text-zinc-400">Usage metering</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rate limits & metrics */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <div className={eyebrow}><Zap className="h-3 w-3" /> Rate limits</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Predictable. Burstable.
              </h2>
              <p className="mt-2 text-zinc-400">
                All limits are token-bucket and per-workspace. Burst headroom
                included on every plan. Upgrade or contact us for custom RPS.
              </p>
              <div className="mt-6 overflow-hidden rounded-lg border border-white/[0.08]">
                <table className="w-full text-sm">
                  <thead className={`${mono} bg-white/[0.02] text-[11px] uppercase tracking-wider text-zinc-500`}>
                    <tr>
                      <th className="px-4 py-2 text-left">Plan</th>
                      <th className="px-4 py-2 text-left">RPS</th>
                      <th className="px-4 py-2 text-left">Burst</th>
                      <th className="px-4 py-2 text-left">Monthly</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-300">
                    {[
                      ["Developer", "5", "20", "10K"],
                      ["Scale", "50", "200", "1M"],
                      ["Enterprise", "Custom", "Custom", "Unlimited"],
                    ].map((r) => (
                      <tr key={r[0]} className="border-t border-white/[0.05]">
                        {r.map((c, i) => (
                          <td key={i} className={`${i === 0 ? "" : mono} px-4 py-2.5`}>{c}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className={eyebrow}><LineChart className="h-3 w-3" /> API metrics · last 24h</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Production-grade observability.
              </h2>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  { l: "Requests", v: "1.42M", s: "+12.4%" },
                  { l: "p95 latency", v: "412ms", s: "-38ms" },
                  { l: "Error rate", v: "0.02%", s: "stable" },
                  { l: "Uptime", v: "99.98%", s: "30d" },
                ].map((m) => (
                  <div key={m.l} className={`${card} p-4`}>
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500">{m.l}</div>
                    <div className="mt-1 font-mono text-2xl text-white">{m.v}</div>
                    <div className="mt-1 text-[11px] text-emerald-400">{m.s}</div>
                  </div>
                ))}
              </div>
              <div className={`${card} mt-3 p-4`}>
                <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>requests / hour</span>
                  <span>last 24h</span>
                </div>
                <div className="flex h-20 items-end gap-1">
                  {Array.from({ length: 32 }).map((_, i) => {
                    const h = 25 + ((Math.sin(i / 2) + 1) / 2) * 70 + (i % 5) * 2;
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-gradient-to-t from-emerald-500/20 to-emerald-400/80"
                        style={{ height: `${h}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Models */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="mb-10">
          <div className={eyebrow}><Cpu className="h-3 w-3" /> Model routing</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            One API. Four routed engines.
          </h2>
          <p className="mt-2 max-w-2xl text-zinc-400">
            HustleAI APIs sit on top of a multi-model orchestration layer. Pick
            a routing label — we handle failover, fallback and cost-balancing
            across the underlying engines.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {MODELS.map((m) => (
            <div key={m.name} className={`${card} p-5`}>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <div className="font-medium text-white">{m.name}</div>
              </div>
              <p className="mt-3 text-sm text-zinc-400">{m.desc}</p>
              <div className="mt-4 text-[11px] uppercase tracking-wider text-zinc-500">Best for</div>
              <div className={`${mono} mt-1 text-zinc-300`}>{m.best}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="border-t border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <div className="mb-10">
            <div className={eyebrow}>Use cases</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Built for teams shipping AI in production.
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {USECASES.map((u) => (
              <div key={u.t} className={`${card} p-5`}>
                <div className="font-medium text-white">{u.t}</div>
                <p className="mt-2 text-sm text-zinc-400">{u.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-5 py-20">
        <div className="mb-10 text-center">
          <div className={`${eyebrow} justify-center`}>Pricing</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Usage-based. No surprises.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {PRICING.map((p) => (
            <div
              key={p.name}
              className={`${card} p-6 ${p.featured ? "border-emerald-500/40 bg-emerald-500/[0.04] ring-1 ring-emerald-500/20" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-white">{p.name}</div>
                {p.featured && (
                  <Badge className="bg-emerald-500 text-black hover:bg-emerald-500">Most popular</Badge>
                )}
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight text-white">{p.price}</span>
                {p.suffix && <span className="text-sm text-zinc-500">{p.suffix}</span>}
              </div>
              <p className="mt-1 text-sm text-zinc-400">{p.blurb}</p>
              <ul className="mt-5 space-y-2 text-sm text-zinc-300">
                {p.items.map((it) => (
                  <li key={it} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
              <Button
                className={`mt-6 w-full ${p.featured ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-white/[0.05] text-white hover:bg-white/[0.1]"}`}
                asChild
              >
                <Link to="/signup">{p.name === "Enterprise" ? "Contact sales" : "Start building"}</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <div className={`${card} ${grid} relative overflow-hidden p-10 lg:p-14`}>
            <div className={eyebrow}><StatusDot /> api.hustlaiapp.in</div>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white md:text-5xl">
              Ship operational AI<br />in a weekend.
            </h2>
            <p className="mt-4 max-w-xl text-zinc-400">
              Get a key, install the SDK, hit the endpoint. The same
              infrastructure powering HustleAI Workspace OS is one curl away.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" className="bg-emerald-500 text-black hover:bg-emerald-400" asChild>
                <Link to="/signup">Get API key <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/10 bg-white/[0.02] text-zinc-200 hover:bg-white/[0.05]" asChild>
                <Link to="/docs">Read the docs</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.06]">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-5 py-8 text-[12px] text-zinc-500 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span>HustleAI API · operational AI infrastructure</span>
            </div>
            <div className="flex flex-wrap gap-5">
              <a href="#catalog" className="hover:text-zinc-300">APIs</a>
              <a href="#pricing" className="hover:text-zinc-300">Pricing</a>
              <Link to="/docs" className="hover:text-zinc-300">Docs</Link>
              <Link to="/privacy-policy" className="hover:text-zinc-300">Privacy</Link>
              <Link to="/terms-conditions" className="hover:text-zinc-300">Terms</Link>
            </div>
            <div>© {new Date().getFullYear()} HustleAI · Built upon the HustleAI API stack</div>
          </div>
        </div>
      </section>
    </div>
  );
}