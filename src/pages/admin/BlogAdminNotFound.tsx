/**
 * Smart 404 for any /admin/blog/* path that doesn't match a registered route.
 *
 * Instead of falling to the global NotFound (which auto-redirects home),
 * this page:
 *   - Shows the bad slug
 *   - Suggests the closest existing module (Levenshtein-ish)
 *   - Lists every Editorial OS module grouped, so the operator can pivot fast
 */
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Compass, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EDITORIAL_OS_MODULES } from "./EditorialOS";

function distance(a: string, b: string) {
  const al = a.length, bl = b.length;
  if (!al) return bl; if (!bl) return al;
  const dp = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
  for (let i = 0; i <= al; i++) dp[i][0] = i;
  for (let j = 0; j <= bl; j++) dp[0][j] = j;
  for (let i = 1; i <= al; i++) for (let j = 1; j <= bl; j++) {
    dp[i][j] = a[i - 1] === b[j - 1]
      ? dp[i - 1][j - 1]
      : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  }
  return dp[al][bl];
}

function suggest(slug: string) {
  const target = slug.toLowerCase().replace(/[^a-z0-9]/g, "");
  return [...EDITORIAL_OS_MODULES]
    .map((m) => ({ m, d: distance(target, m.href.split("/").pop()!.replace(/[^a-z0-9]/g, "")) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .map(({ m }) => m);
}

export default function BlogAdminNotFound() {
  const loc = useLocation();
  const navigate = useNavigate();
  const tail = loc.pathname.replace(/^\/admin\/blog\/?/, "");
  const matches = suggest(tail || "editorial");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 pt-20 pb-12">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
          <Link to="/admin" className="hover:text-foreground">Admin</Link>
          <span className="mx-2">/</span>
          <Link to="/admin/blog/os" className="hover:text-foreground">Editorial OS</Link>
          <span className="mx-2">/</span>
          <span>Unknown module</span>
        </div>

        <h1 className="font-display text-3xl font-bold">That admin module doesn’t exist.</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn’t find <code className="text-foreground">/admin/blog/{tail || "—"}</code>.
          You probably meant one of these — or jump straight back to the operating system.
        </p>

        <div className="mt-8 rounded-xl border border-border/60 bg-card p-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-3">
            Closest matches
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {matches.map((m) => (
              <Link key={m.href + m.label} to={m.href} className="group rounded-lg border border-border/60 p-3 hover:border-foreground/30 transition-colors">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <m.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{m.label}</span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground leading-snug">{m.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button onClick={() => navigate("/admin/blog/os")} className="gap-2">
            <Compass className="h-3.5 w-3.5" /> Open Editorial OS
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground ml-2">← Admin home</Link>
        </div>

        <div className="mt-10 text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">All modules</div>
        <div className="grid sm:grid-cols-2 gap-2">
          {EDITORIAL_OS_MODULES.map((m) => (
            <Link key={m.href + m.label} to={m.href} className="flex items-center gap-2 rounded-md border border-border/40 px-3 py-2 text-sm hover:bg-accent/40">
              <Search className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{m.label}</span>
              <span className="ml-auto text-[11px] text-muted-foreground truncate">{m.href}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}