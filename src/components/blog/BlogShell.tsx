import { Link, useLocation } from "react-router-dom";
import { ReactNode, useEffect } from "react";

const NAV_CATEGORIES: { slug: string; label: string }[] = [
  { slug: "freelancer-workflows", label: "Freelancer Systems" },
  { slug: "async-operations", label: "Async Operations" },
  { slug: "ai-operations", label: "AI Workflows" },
  { slug: "client-systems", label: "Client Management" },
  { slug: "creator-workflows", label: "Proposals" },
  { slug: "telegram-delivery", label: "Delivery" },
];

/**
 * Editorial shell used on the blogs.hustlaiapp.in subdomain.
 * Minimal, premium, ad-ready, low-CLS.
 */
export function BlogShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  // Apply the warm editorial surface to the body when blog is mounted.
  useEffect(() => {
    document.body.classList.add("editorial-surface");
    return () => document.body.classList.remove("editorial-surface");
  }, []);
  const isHome = pathname === "/";
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-serif text-[14px] shadow-sm shadow-emerald-700/20">
              H
              <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 ring-2 ring-background" />
            </span>
            <span className="font-serif text-[17px] tracking-tight">
              HustleAI <span className="text-muted-foreground/70">·</span> <span className="text-muted-foreground">Notes</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/"
              className={`hidden sm:inline px-2.5 py-1 rounded-md transition ${isHome ? "text-foreground bg-muted/40" : "text-muted-foreground hover:text-foreground"}`}
            >
              Home
            </Link>
            <a href="https://hustlaiapp.in/about" className="hidden md:inline px-2.5 py-1 text-muted-foreground hover:text-foreground rounded-md">About</a>
            <a
              href="https://hustlaiapp.in"
              className="ml-1 inline-flex items-center gap-1.5 text-foreground/90 hover:text-foreground border border-border/60 rounded-full pl-3 pr-2.5 py-1 text-xs hover:border-foreground/40 transition-colors"
            >
              Open workspace
              <span aria-hidden className="inline-block translate-y-[-1px]">→</span>
            </a>
          </nav>
        </div>
        {/* Editorial section navigation strip */}
        <div className="border-t border-border/40 bg-background/60">
          <div className="mx-auto max-w-6xl px-5">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar h-10 text-[12.5px]">
              {NAV_CATEGORIES.map((c) => {
                const active = pathname === `/category/${c.slug}`;
                return (
                  <Link
                    key={c.slug}
                    to={`/category/${c.slug}`}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-md transition ${
                      active
                        ? "text-foreground bg-muted/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    }`}
                  >
                    {c.label}
                  </Link>
                );
              })}
              <div className="ml-auto hidden sm:flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground/80">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Updated daily
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border/60 mt-24 bg-gradient-to-b from-transparent to-muted/20">
        <div className="mx-auto max-w-6xl px-5 py-14 grid gap-10 md:grid-cols-12 text-sm">
          <div className="md:col-span-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-serif text-[14px]">H</span>
              <span className="font-serif text-base">HustleAI Notes</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              An operational publication for freelancers and async operators. Field notes on workflows,
              client systems, AI exports, and the messy reality of shipping client work.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="https://hustlaiapp.in" className="rounded-md border border-border/60 px-3 py-1.5 text-xs hover:border-foreground/40">Open workspace →</a>
              <a href="https://hustlaiapp.in/tools" className="rounded-md border border-border/60 px-3 py-1.5 text-xs text-foreground/80 hover:text-foreground hover:border-foreground/40">Free tools</a>
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-3">Topics</div>
            <ul className="space-y-1.5 text-muted-foreground">
              {NAV_CATEGORIES.map((c) => (
                <li key={c.slug}><Link to={`/category/${c.slug}`} className="hover:text-foreground">{c.label}</Link></li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-3">
            <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-3">Editorial</div>
            <ul className="space-y-1.5 text-muted-foreground">
              <li><a href="https://hustlaiapp.in/about" className="hover:text-foreground">About HustleAI</a></li>
              <li><a href="https://hustlaiapp.in/company" className="hover:text-foreground">Company</a></li>
              <li><a href="https://hustlaiapp.in/contact" className="hover:text-foreground">Contact editors</a></li>
              <li><a href="https://hustlaiapp.in/security" className="hover:text-foreground">Security</a></li>
              <li><a href="https://hustlaiapp.in/compliance" className="hover:text-foreground">Compliance</a></li>
            </ul>
          </div>
          <div className="md:col-span-3">
            <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-3">Standards</div>
            <ul className="space-y-2 text-muted-foreground text-[13px] leading-relaxed">
              <li>· Articles are operationally reviewed by working freelancers.</li>
              <li>· Updated when the underlying workflow changes.</li>
              <li>· Tools mentioned are tools we actually run.</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/60">
          <div className="mx-auto max-w-6xl px-5 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div>© {new Date().getFullYear()} HustleAI · An operational publication.</div>
            <div className="flex gap-4">
              <a className="hover:text-foreground" href="https://hustlaiapp.in/privacy-policy">Privacy</a>
              <a className="hover:text-foreground" href="https://hustlaiapp.in/terms-conditions">Terms</a>
              <a className="hover:text-foreground" href="https://hustlaiapp.in/acceptable-use">Acceptable use</a>
              <a className="hover:text-foreground" href="https://hustlaiapp.in/data-policy">Data</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}