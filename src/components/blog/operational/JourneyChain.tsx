import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { SeoBlogRow } from "@/lib/seo-cms";

/** Visual prev/next chain — connects each guide into a journey. */
export function JourneyChain({
  prev,
  next,
}: {
  prev?: SeoBlogRow | null;
  next?: SeoBlogRow | null;
}) {
  if (!prev && !next) return null;
  return (
    <nav className="not-prose my-12 grid gap-3 md:grid-cols-2">
      {prev ? (
        <Link
          to={`/insights/${prev.slug}`}
          className="group rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-300 transition-colors"
        >
          <div className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400 mb-1 inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Previous in journey
          </div>
          <div className="font-display font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-emerald-700">
            {prev.title}
          </div>
        </Link>
      ) : <span />}
      {next ? (
        <Link
          to={`/insights/${next.slug}`}
          className="group rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-300 transition-colors text-right"
        >
          <div className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400 mb-1 inline-flex items-center gap-1 justify-end w-full">
            Next in journey <ArrowRight className="w-3 h-3" />
          </div>
          <div className="font-display font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-emerald-700">
            {next.title}
          </div>
        </Link>
      ) : <span />}
    </nav>
  );
}