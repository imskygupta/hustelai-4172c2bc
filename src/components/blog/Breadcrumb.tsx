import { Link } from "react-router-dom";

export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[12px] text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {it.to && !last ? (
                <Link to={it.to} className="hover:text-foreground transition-colors">{it.label}</Link>
              ) : (
                <span className={last ? "text-foreground/70 line-clamp-1" : ""}>{it.label}</span>
              )}
              {!last && <span className="text-muted-foreground/60">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
