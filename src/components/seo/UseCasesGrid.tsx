import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export interface UseCase {
  title: string;
  description: string;
  href: string;
}

export function UseCasesGrid({ items, title = "Built for how operators actually work" }: { items: UseCase[]; title?: string }) {
  if (!items?.length) return null;
  return (
    <section className="px-4 mt-20">
      <div className="container mx-auto max-w-6xl">
        {title ? (
          <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-slate-900 mb-8">{title}</h2>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((u) => (
            <Link
              key={u.href}
              to={u.href}
              className="group rounded-2xl border border-slate-200 bg-white p-6 hover:border-emerald-300 hover:shadow-sm transition"
            >
              <h3 className="text-base font-semibold text-slate-900 group-hover:text-emerald-700">{u.title}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{u.description}</p>
              <span className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-emerald-700">
                Explore <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}