import { ReactNode } from "react";
import { Activity, Globe2, Zap, Shield, ArrowUpRight } from "lucide-react";

const endpoints = [
  { method: "POST", path: "/v1/chat/completions", ms: 142, status: 200 },
  { method: "POST", path: "/v1/embeddings", ms: 38, status: 200 },
  { method: "GET", path: "/v1/models", ms: 21, status: 200 },
  { method: "POST", path: "/v1/images/generate", ms: 980, status: 200 },
];

const stats = [
  { label: "Uptime", value: "99.97%" },
  { label: "p50 latency", value: "84ms" },
  { label: "Regions", value: "12" },
];

function MethodPill({ m }: { m: string }) {
  const color =
    m === "GET"
      ? "bg-sky-400/10 text-sky-300 ring-sky-400/30"
      : m === "POST"
      ? "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30"
      : "bg-amber-400/10 text-amber-300 ring-amber-400/30";
  return (
    <span className={`inline-flex items-center px-1.5 py-[1px] rounded text-[9px] font-mono font-semibold ring-1 ${color}`}>
      {m}
    </span>
  );
}

function LeftPanel({ headline }: { headline: string }) {
  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#05070a] p-10 xl:p-14">
      {/* gradient + noise */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.55]"
        style={{
          background:
            "radial-gradient(900px 500px at 15% 10%, rgba(16,185,129,0.18), transparent 60%), radial-gradient(700px 400px at 90% 90%, rgba(16,185,129,0.10), transparent 60%), radial-gradient(500px 300px at 80% 10%, rgba(56,189,248,0.08), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at 30% 30%, black 30%, transparent 75%)",
        }}
      />

      {/* top: brand */}
      <div className="relative z-10 flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-lg bg-emerald-500/15 ring-1 ring-emerald-400/30 grid place-items-center">
          <span className="font-mono text-emerald-300 text-[13px]">H</span>
        </div>
        <div>
          <div className="text-[14px] font-semibold text-zinc-100 leading-tight">HustleAI</div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-400/80">API Platform · Beta</div>
        </div>
      </div>

      {/* center: headline + endpoints */}
      <div className="relative z-10 space-y-8 max-w-xl">
        <div className="space-y-4">
          <h1 className="font-display text-4xl xl:text-5xl font-semibold text-white leading-[1.05] tracking-tight">
            {headline}
          </h1>
          <p className="text-[14px] leading-relaxed text-zinc-400 max-w-md">
            Production-grade AI infrastructure with multi-provider routing, automatic
            failover, and global edge delivery. One key. Every model.
          </p>
        </div>

        {/* endpoint cards */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.015]">
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <Activity className="h-3 w-3 text-emerald-400" />
              <span className="font-mono">live · last 60s</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300/90">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              all systems normal
            </span>
          </div>
          <ul className="divide-y divide-white/[0.05]">
            {endpoints.map((e, i) => (
              <li
                key={e.path}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
                style={{ animation: `fadeInUp .5s ease ${i * 90}ms both` }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MethodPill m={e.method} />
                  <code className="text-[12px] font-mono text-zinc-300 truncate">{e.path}</code>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500 shrink-0">
                  <span>{e.ms}ms</span>
                  <span className="text-emerald-400">{e.status}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* stats */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-white/[0.06] bg-white/[0.015] px-3 py-3"
            >
              <div className="text-[18px] font-semibold text-white tracking-tight">{s.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* bottom: trust badges */}
      <div className="relative z-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5"><Zap className="h-3 w-3 text-emerald-400" /> 50k free API calls</span>
        <span className="inline-flex items-center gap-1.5"><Shield className="h-3 w-3 text-emerald-400" /> 99.9% uptime SLA</span>
        <span className="inline-flex items-center gap-1.5"><Globe2 className="h-3 w-3 text-emerald-400" /> Global edge infra</span>
        <a href="https://api.hustlaiapp.in" className="ml-auto inline-flex items-center gap-1 text-zinc-400 hover:text-emerald-300 transition-colors">
          api.hustlaiapp.in <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function MobileHero({ headline }: { headline: string }) {
  return (
    <div className="lg:hidden relative overflow-hidden bg-[#05070a] px-6 pt-8 pb-6 border-b border-white/[0.06]">
      <div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(500px 280px at 20% 0%, rgba(16,185,129,0.18), transparent 60%)",
        }}
      />
      <div className="relative z-10 flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-md bg-emerald-500/15 ring-1 ring-emerald-400/30 grid place-items-center text-emerald-300 font-mono text-[11px]">H</div>
        <div>
          <div className="text-[12px] font-semibold text-zinc-100">HustleAI</div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-emerald-400/80">API Platform · Beta</div>
        </div>
      </div>
      <h1 className="relative z-10 text-2xl font-semibold text-white tracking-tight leading-tight">
        {headline}
      </h1>
      <div className="relative z-10 mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-500">
        <span>50k free calls</span><span>·</span>
        <span>99.9% uptime</span><span>·</span>
        <span>Global edge</span>
      </div>
    </div>
  );
}

export function AuthShell({
  children,
  headline,
  eyebrow,
  title,
  subtitle,
  footer,
}: {
  children: ReactNode;
  headline: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#05070a] text-zinc-200">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes drift {
          0%,100% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(0,-12px,0); }
        }
        .auth-card-glow::before {
          content: ""; position: absolute; inset: -1px; border-radius: 16px;
          background: linear-gradient(135deg, rgba(16,185,129,0.35), rgba(16,185,129,0) 40%, rgba(56,189,248,0.18));
          z-index: -1; filter: blur(12px); opacity: .5;
        }
      `}</style>
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <LeftPanel headline={headline} />
        <MobileHero headline={headline} />
        {/* right: auth card */}
        <div className="relative flex items-center justify-center px-5 sm:px-8 py-10 lg:py-14">
          <div
            aria-hidden
            className="absolute inset-0 opacity-50"
            style={{
              background:
                "radial-gradient(600px 400px at 80% 20%, rgba(16,185,129,0.06), transparent 60%), radial-gradient(500px 300px at 20% 90%, rgba(56,189,248,0.05), transparent 60%)",
            }}
          />
          <div className="relative w-full max-w-[420px]">
            <div className="relative auth-card-glow">
              <div className="relative rounded-2xl border border-white/[0.08] bg-zinc-950/70 backdrop-blur-xl p-7 sm:p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
                <div className="mb-6">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-400/90 font-medium mb-2">
                    {eyebrow}
                  </div>
                  <h2 className="text-[22px] font-semibold text-white tracking-tight leading-tight">
                    {title}
                  </h2>
                  <p className="text-[13px] text-zinc-400 mt-1.5 leading-relaxed">{subtitle}</p>
                </div>
                {children}
                {footer ? (
                  <div className="mt-6 pt-5 border-t border-white/[0.06] text-center text-[12px] text-zinc-500">
                    {footer}
                  </div>
                ) : null}
              </div>
            </div>
            <p className="mt-5 text-center text-[10px] text-zinc-600">
              Protected by enterprise-grade auth · SOC 2 aligned
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Shared Clerk appearance overrides — premium dark, emerald accents,
 * removes the default "Secured by Clerk" dominance.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#10b981",
    colorBackground: "transparent",
    colorInputBackground: "rgba(255,255,255,0.025)",
    colorInputText: "#e5e7eb",
    colorText: "#e5e7eb",
    colorTextSecondary: "#a1a1aa",
    colorDanger: "#f43f5e",
    colorSuccess: "#10b981",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
    borderRadius: "10px",
    fontSize: "14px",
  },
  elements: {
    rootBox: "w-full",
    card: "bg-transparent shadow-none border-0 p-0 w-full",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-zinc-200 normal-case font-medium h-10 rounded-lg transition-colors",
    socialButtonsBlockButtonText: "text-[13px] font-medium",
    socialButtonsProviderIcon: "h-4 w-4",
    dividerRow: "my-4",
    dividerLine: "bg-white/[0.06]",
    dividerText: "text-zinc-500 text-[11px] uppercase tracking-wider",
    formFieldLabel: "text-[12px] text-zinc-400 font-medium",
    formFieldInput:
      "bg-white/[0.025] border border-white/[0.08] text-zinc-100 h-10 rounded-lg focus:border-emerald-400/50 focus:ring-emerald-400/20",
    formButtonPrimary:
      "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold normal-case h-10 rounded-lg shadow-[0_8px_24px_-8px_rgba(16,185,129,0.6)] transition-colors",
    footer: "hidden",
    footerAction: "hidden",
    footerActionText: "text-zinc-500 text-[12px]",
    footerActionLink: "text-emerald-400 hover:text-emerald-300 font-medium",
    identityPreview: "bg-white/[0.02] border border-white/[0.06] rounded-lg",
    formFieldInputShowPasswordButton: "text-zinc-500 hover:text-zinc-300",
    otpCodeFieldInput:
      "bg-white/[0.025] border border-white/[0.08] text-zinc-100 rounded-lg",
    badge: "bg-emerald-500/10 text-emerald-300 border-emerald-400/20",
    formResendCodeLink: "text-emerald-400 hover:text-emerald-300",
    alternativeMethodsBlockButton:
      "border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-zinc-200",
  },
  layout: {
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
    showOptionalFields: false,
    helpPageUrl: "https://docs.hustlaiapp.in",
    privacyPageUrl: "https://hustlaiapp.in/privacy",
    termsPageUrl: "https://hustlaiapp.in/terms",
  },
};