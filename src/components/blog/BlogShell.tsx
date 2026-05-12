import { Link, useLocation } from "react-router-dom";
import { ReactNode } from "react";

/**
 * Editorial shell used on the blogs.hustlaiapp.in subdomain.
 * Minimal, premium, ad-ready, low-CLS.
 */
export function BlogShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/95 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between">
          <Link to="/" className="font-serif text-lg tracking-tight">
            HustleAI <span className="text-muted-foreground">/ Notes</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link to="/" className={pathname === "/" ? "text-foreground" : "hover:text-foreground"}>All</Link>
            <Link to="/category/workflows" className="hover:text-foreground hidden sm:inline">Workflows</Link>
            <Link to="/category/freelancing" className="hover:text-foreground hidden sm:inline">Freelancing</Link>
            <Link to="/category/ai" className="hover:text-foreground hidden sm:inline">AI</Link>
            <a href="https://hustlaiapp.in" className="text-foreground/80 hover:text-foreground border border-border/60 rounded-full px-3 py-1 text-xs">
              Open HustleAI →
            </a>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border/60 mt-24">
        <div className="mx-auto max-w-6xl px-5 py-10 grid sm:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="font-serif text-base mb-2">HustleAI Notes</div>
            <p className="text-muted-foreground">Operational writing on freelance workflows, async client systems, and AI exports.</p>
          </div>
          <div>
            <div className="font-medium mb-2">Read</div>
            <ul className="space-y-1 text-muted-foreground">
              <li><Link to="/category/workflows" className="hover:text-foreground">Workflows</Link></li>
              <li><Link to="/category/freelancing" className="hover:text-foreground">Freelancing</Link></li>
              <li><Link to="/category/ai" className="hover:text-foreground">AI</Link></li>
              <li><Link to="/category/operations" className="hover:text-foreground">Operations</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-2">Operate alongside the publication</div>
            <p className="text-muted-foreground mb-3">
              The workflows in these notes run inside HustleAI — workspaces, async exports, Telegram delivery, client systems.
              Open the workspace when you're ready, no rush.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="https://hustlaiapp.in" className="inline-block rounded-md border border-border/60 text-foreground px-3 py-1.5 text-xs hover:border-foreground/40">Open workspace</a>
              <a href="https://hustlaiapp.in/tools" className="inline-block rounded-md border border-border/60 text-foreground/80 px-3 py-1.5 text-xs hover:text-foreground hover:border-foreground/40">Free tools</a>
            </div>
          </div>
        </div>
        <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} HustleAI · <a className="hover:text-foreground" href="https://hustlaiapp.in/privacy-policy">Privacy</a> · <a className="hover:text-foreground" href="https://hustlaiapp.in/terms-conditions">Terms</a>
        </div>
      </footer>
    </div>
  );
}