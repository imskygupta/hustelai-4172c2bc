import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Search, BookOpen, ChevronRight, Menu, X, ExternalLink } from "lucide-react";
import {
  listDocsCategories,
  listDocsPages,
  type DocsCategory,
  type DocsPage,
} from "@/integrations/docs/client";
import { Input } from "@/components/ui/input";
import { SEO } from "@/components/SEO";
import { cn } from "@/lib/utils";

export default function DocsLayout() {
  const [cats, setCats] = useState<DocsCategory[]>([]);
  const [pages, setPages] = useState<DocsPage[]>([]);
  const [q, setQ] = useState("");
  const [openMobile, setOpenMobile] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    listDocsCategories().then(setCats);
    listDocsPages().then(setPages);
  }, []);

  useEffect(() => {
    setOpenMobile(false);
  }, [pathname]);

  const grouped = useMemo(() => {
    const term = q.trim().toLowerCase();
    return cats.map((c) => ({
      ...c,
      pages: pages
        .filter((p) => p.category_id === c.id)
        .filter(
          (p) =>
            !term ||
            p.title.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term) ||
            p.content.toLowerCase().includes(term),
        ),
    }));
  }, [cats, pages, q]);

  const totalMatches = q ? grouped.reduce((n, g) => n + g.pages.length, 0) : -1;

  function onSearchKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && q && totalMatches > 0) {
      const first = grouped.find((g) => g.pages.length > 0)?.pages[0];
      if (first) navigate(`/docs/${first.slug}`);
    }
  }

  const Sidebar = (
    <nav className="flex flex-col gap-6 text-sm">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onSearchKey}
          placeholder="Search docs…"
          className="pl-9 h-9 bg-background/60"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {q && (
        <div className="text-xs text-muted-foreground -mt-3">
          {totalMatches} result{totalMatches === 1 ? "" : "s"}
        </div>
      )}

      {grouped.map((g) =>
        q && g.pages.length === 0 ? null : (
          <div key={g.id}>
            <div className="px-2 mb-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              {g.title}
            </div>
            <ul className="space-y-0.5">
              {g.pages.map((p) => (
                <li key={p.id}>
                  <NavLink
                    to={`/docs/${p.slug}`}
                    className={({ isActive }) =>
                      cn(
                        "block rounded-md px-2 py-1.5 text-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors",
                        isActive &&
                          "bg-primary/10 text-primary font-medium border-l-2 border-primary -ml-[2px] pl-[10px]",
                      )
                    }
                  >
                    {p.title}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ),
      )}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Docs — HustleAI Workspace OS"
        description="Official documentation for HustleAI Workspace OS: setup guides, CRM, invoices, AI Fuel, proposals, and more."
        path="/docs"
      />

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 h-14 flex items-center justify-between gap-4">
          <Link to="/docs" className="flex items-center gap-2 font-semibold">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm">
              HustleAI <span className="text-muted-foreground">/ Docs</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-3 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-foreground">App</Link>
            <Link to="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link>
            <a
              href="https://hustlaiapp.in"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              hustlaiapp.in <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            className="md:hidden p-2 rounded-md border border-border"
            onClick={() => setOpenMobile((v) => !v)}
            aria-label="Toggle menu"
          >
            {openMobile ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 py-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
            {Sidebar}
          </div>
        </aside>

        {/* Mobile drawer */}
        {openMobile && (
          <aside className="lg:hidden fixed inset-x-0 top-14 bottom-0 z-30 bg-background border-t border-border overflow-y-auto p-4">
            {Sidebar}
          </aside>
        )}

        <main className="min-w-0">
          <Outlet context={{ pages, cats }} />
        </main>
      </div>
    </div>
  );
}