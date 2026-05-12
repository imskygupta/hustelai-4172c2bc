import { Link } from "react-router-dom";
import { ArrowRight, Workflow, Plug, Wrench, Layers } from "lucide-react";
import { byKind, KIND_META, type SeoKind, type SeoEntry } from "@/lib/seo/programmatic-catalog";

const ICONS: Record<SeoKind, any> = {
  features: Layers,
  integrations: Plug,
  workflows: Workflow,
  "use-cases": Layers,
  "free-tools": Wrench,
};

function pick(kind: SeoKind, exclude?: SeoEntry, limit = 3): SeoEntry[] {
  return byKind(kind).filter((e) => e.slug !== exclude?.slug).slice(0, limit);
}

function Cluster({ kind, items }: { kind: SeoKind; items: SeoEntry[] }) {
  if (!items.length) return null;
  const Icon = ICONS[kind];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate-700">
        <Icon className="w-4 h-4 text-emerald-600" />
        <h3 className="text-sm font-semibold uppercase tracking-wider">{KIND_META[kind].label}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((e) => (
          <li key={e.path}>
            <Link
              to={e.path}
              className="group flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 hover:border-emerald-300 hover:bg-emerald-50/40 transition"
            >
              <span className="flex-1 text-sm text-slate-700 group-hover:text-slate-900 leading-snug">{e.h1}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 mt-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Four-cluster related block. Skips the page's own cluster from duplicating. */
export function RelatedClusters({ current }: { current?: SeoEntry }) {
  const kinds: SeoKind[] = ["workflows", "integrations", "free-tools", "use-cases"];
  return (
    <section className="px-4 mt-20">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-400 mb-1">Explore more</div>
            <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-slate-900">Related across the workspace</h2>
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {kinds.map((k) => (
            <Cluster key={k} kind={k} items={pick(k, current?.kind === k ? current : undefined, 3)} />
          ))}
        </div>
      </div>
    </section>
  );
}