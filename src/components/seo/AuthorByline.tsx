import { Link } from "react-router-dom";
import type { SeoAuthorRow } from "@/lib/seo-cms";

export function AuthorByline({ author, readingTime, updatedAt }: { author?: SeoAuthorRow | null; readingTime?: number; updatedAt?: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      {author && (
        <Link to={`/authors/${author.slug}`} className="flex items-center gap-2 hover:text-primary">
          {author.avatar_url ? (
            <img src={author.avatar_url} alt={author.display_name} className="w-6 h-6 rounded-full" loading="lazy" />
          ) : (
            <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
              {author.display_name.slice(0, 1)}
            </span>
          )}
          <span>{author.display_name}</span>
        </Link>
      )}
      {readingTime ? <span>· {readingTime} min read</span> : null}
      {updatedAt ? <span>· Updated {new Date(updatedAt).toLocaleDateString()}</span> : null}
    </div>
  );
}