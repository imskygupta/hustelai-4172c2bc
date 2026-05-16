import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Search, BookOpen, Menu, X, ExternalLink, Command,
  LayoutGrid, Sparkles, Code2, Compass, ArrowUpRight,
} from "lucide-react";
import {
  listDocsCategories,
  listDocsPages,
  type DocsCategory,
  type DocsPage,
} from "@/integrations/docs/client";
import { Input } from "@/components/ui/input";
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("docs-sidebar-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
      if (first) navigate(`/${first.slug}`);
    }
  }

  const Sidebar = (
    <nav className="flex flex-col gap-6 text-sm">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="docs-sidebar-search"
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
                    to={`/${p.slug}`}
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
    <div className="docs-shell min-h-screen bg-[hsl(var(--background))] text-foreground [color-scheme:dark]">
      <Helmet>
        <title>HustleAI Docs — Guides, workflows & operational systems for freelancers</title>
        <meta
          name="description"
          content="Official HustleAI Workspace OS documentation. Guides, workflows, CRM, invoices, AI Fuel, proposals, intake, client portals and more."
        />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={`https://docs.hustlaiapp.in${pathname}`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="HustleAI Docs" />
        <meta
          property="og:description"
          content="Guides, workflows and operational systems for freelancers."
        />
        <meta property="og:url" content={`https://docs.hustlaiapp.in${pathname}`} />
        <meta property="og:image" content="https://hustlaiapp.in/favicon.png" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {/* Top bar — distinct dark "docs" shell */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[hsl(222_22%_7%)]/85 backdrop-blur supports-[backdrop-filter]:bg-[hsl(222_22%_7%)]/70">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-semibold shrink-0">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg shadow-primary/20">
              <BookOpen className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm tracking-tight">
              HustleAI <span className="text-muted-foreground font-normal">/ Docs</span>
            </span>
          </Link>

          {/* CMD+K placeholder search */}
          <button
            onClick={() => document.getElementById("docs-sidebar-search")?.focus()}
            className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-4 h-9 px-3 rounded-md border border-white/10 bg-white/[0.02] text-sm text-muted-foreground hover:border-white/20 hover:text-foreground transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">Search docs…</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border border-white/10 bg-white/5">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            <DocsTopLink to="/" icon={LayoutGrid}>Categories</DocsTopLink>
            <a
              href="https://hustlaiapp.in"
              className="ml-1 inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Back to app <ArrowUpRight className="w-3 h-3" />
            </a>
          </nav>

          <button
            className="md:hidden p-2 rounded-md border border-white/10"
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
          <aside className="lg:hidden fixed inset-x-0 top-14 bottom-0 z-30 bg-[hsl(222_22%_7%)] border-t border-white/5 overflow-y-auto p-4">
            {Sidebar}
          </aside>
        )}

        <main className="min-w-0 text-[15px] leading-relaxed">
          <Outlet context={{ pages, cats }} />
        </main>
      </div>

      <footer className="border-t border-white/5 mt-16 py-8 text-center text-xs text-muted-foreground">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>Powered by <span className="text-foreground font-medium">HustleAI Workspace OS</span></div>
          <div className="flex gap-4">
            <a href="https://hustlaiapp.in" className="hover:text-foreground">hustlaiapp.in</a>
            <Link to="/" className="hover:text-foreground">Docs home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DocsTopLink({
  to, icon: Icon, children,
}: { to: string; icon: any; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          "inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors text-xs",
          isActive && "text-foreground bg-white/[0.04]",
        )
      }
    >
      <Icon className="w-3.5 h-3.5" /> {children}
    </NavLink>
  );
}