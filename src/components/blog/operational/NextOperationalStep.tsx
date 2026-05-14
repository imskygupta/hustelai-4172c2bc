import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Compass, Rocket } from "lucide-react";
import { fetchRecommendedToolsFromPost, trackToolLaunch } from "@/lib/behavior";

/**
 * "Next operational step" — adaptive recommendation block at the
 * end of an article. Combines learned behavior (recommend_next_tools RPC)
 * with a deterministic editorial fallback so new articles still get
 * a meaningful suggestion before any data exists.
 */

interface FallbackSpec {
  match: RegExp;
  current: string;
  next: string;
  steps: { label: string; to: string }[];
}

const FALLBACKS: FallbackSpec[] = [
  {
    match: /onboard|intake|kickoff/i,
    current: "client onboarding",
    next: "automate proposals and contracts",
    steps: [
      { label: "AI Proposal Generator", to: "/proposal-generator" },
      { label: "Contract Generator", to: "/tools/contract-generator" },
      { label: "Branded Client Portal", to: "/client-portal-software" },
    ],
  },
  {
    match: /proposal|quote|pitch/i,
    current: "winning proposals",
    next: "structure onboarding & delivery",
    steps: [
      { label: "Client Onboarding System", to: "/client-onboarding-software" },
      { label: "Branded Client Portal", to: "/client-portal-software" },
      { label: "AI Invoice Generator", to: "/ai-invoice-generator" },
    ],
  },
  {
    match: /invoice|billing|payment|gst/i,
    current: "client billing",
    next: "build a CRM + delivery loop",
    steps: [
      { label: "Freelancer CRM", to: "/freelancer-crm" },
      { label: "Client Portal", to: "/client-portal-software" },
      { label: "Workflow Templates", to: "/workflows" },
    ],
  },
  {
    match: /async|delivery|hand[-\s]?off|approval|portal/i,
    current: "async delivery",
    next: "scale into agency workflows",
    steps: [
      { label: "Agency Workflow Tools", to: "/for-agencies" },
      { label: "Workspace OS", to: "/workspace-os" },
      { label: "Telegram Workflows", to: "/for-telegram-business" },
    ],
  },
  {
    match: /telegram|whatsapp|chat/i,
    current: "Telegram-first ops",
    next: "wire it to a real client backbone",
    steps: [
      { label: "Freelancer CRM", to: "/freelancer-crm" },
      { label: "Client Onboarding System", to: "/client-onboarding-software" },
      { label: "Telegram Workflows", to: "/for-telegram-business" },
    ],
  },
  {
    match: /workflow|automation|automate|template/i,
    current: "operator workflows",
    next: "plug them into your client systems",
    steps: [
      { label: "Workspace OS", to: "/workspace-os" },
      { label: "Freelancer CRM", to: "/freelancer-crm" },
      { label: "Workflow Templates", to: "/workflows" },
    ],
  },
];

function pickFallback(text: string): FallbackSpec {
  for (const f of FALLBACKS) if (f.match.test(text)) return f;
  return {
    current: "this operational system",
    next: "build the rest of your operator stack",
    match: /.*/,
    steps: [
      { label: "Workspace OS", to: "/workspace-os" },
      { label: "Freelancer CRM", to: "/freelancer-crm" },
      { label: "Browse all guides", to: "/insights" },
    ],
  };
}

function labelize(slug: string): string {
  const path = slug.replace(/^\//, "");
  return path
    .split(/[-/]/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(" ");
}

export function NextOperationalStep({
  slug,
  signalText,
  persona,
}: {
  slug: string;
  signalText: string;
  persona?: string | null;
}) {
  const [learned, setLearned] = useState<{ tool_slug: string; launches: number }[]>([]);
  useEffect(() => {
    fetchRecommendedToolsFromPost(slug, 3).then(setLearned);
  }, [slug]);

  const fb = pickFallback(signalText);
  // Use learned tools if we have at least 2 launches worth of signal,
  // otherwise fall back to deterministic editorial mapping.
  const useLearned = learned.length >= 2 && learned.some((l) => l.launches >= 2);
  const steps = useLearned
    ? learned.map((l) => ({ label: labelize(l.tool_slug), to: l.tool_slug.startsWith("/") ? l.tool_slug : `/${l.tool_slug}` }))
    : fb.steps;

  return (
    <aside className="mt-12 not-prose rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6">
      <div className="flex items-center gap-2 mb-2 text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-700">
        <Compass className="w-3.5 h-3.5 text-emerald-600" /> Next operational step
      </div>
      <h3 className="font-display font-semibold text-slate-900 text-lg leading-snug mb-1">
        You've worked through {fb.current}.
      </h3>
      <p className="text-[13.5px] text-slate-600 mb-4">
        {useLearned
          ? "Most operators reading this guide install these next."
          : `Next: ${fb.next}.`}
      </p>
      <div className="grid gap-2 md:grid-cols-3">
        {steps.slice(0, 3).map((s) => (
          <Link
            key={s.to}
            to={s.to}
            onClick={() => trackToolLaunch({
              toolSlug: s.to.replace(/^\//, ""),
              sourceKind: "blog",
              sourceSlug: slug,
              ctaId: "next_step",
              persona: persona ?? null,
            })}
            className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-emerald-300 transition-colors"
          >
            <span className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-slate-900 group-hover:text-emerald-700">
              <Rocket className="w-3.5 h-3.5 text-emerald-600" /> {s.label}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
          </Link>
        ))}
      </div>
    </aside>
  );
}