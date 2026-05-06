export interface TocItem { level: number; text: string; slug: string }

export function TableOfContents({ items }: { items: TocItem[] }) {
  if (!items?.length) return null;
  return (
    <aside className="glass rounded-xl p-4 sticky top-24 text-sm">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">On this page</div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={`${it.slug}-${i}`} className={it.level === 3 ? "pl-3" : ""}>
            <a href={`#${it.slug}`} className="text-foreground/70 hover:text-primary line-clamp-1">
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}