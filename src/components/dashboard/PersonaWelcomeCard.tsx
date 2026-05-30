/**
 * PersonaWelcomeCard — one-time clarity card.
 *
 * Shown the first time a user lands on the dashboard after picking a
 * persona. Tells them, in plain language, which 4 modules they'll live in
 * — without removing access to anything else. Dismissed forever via
 * localStorage keyed per persona so re-entering a mode reshows it once.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { useOperatorMode } from "@/lib/operator-mode";
import { appUrl, isMarketingHost } from "@/lib/host";

/**
 * Module `to` paths in operator-mode.ts are hardcoded as `/workspaces/*`.
 * On the marketing host those resolve to the WorkspaceGateway shell — the
 * user has to click "Enter Workspace" a second time before they land on
 * the actual cockpit surface. Bypass the gateway by hopping straight to
 * `workspace.hustlaiapp.in/<surface>` (Audit 2.5 P1-2).
 */
function resolveModuleHref(to: string): { href: string; external: boolean } {
  if (to.startsWith("/workspaces/") && isMarketingHost()) {
    const stripped = to.replace(/^\/workspaces/, ""); // "/pipeline"
    return { href: appUrl(stripped), external: true };
  }
  return { href: to, external: false };
}

const STORAGE_PREFIX = "hai.persona.welcome.";

export default function PersonaWelcomeCard() {
  const { mode, meta } = useOperatorMode();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!mode) return;
    try {
      const seen = localStorage.getItem(STORAGE_PREFIX + mode) === "1";
      setDismissed(seen);
    } catch { setDismissed(true); }
  }, [mode]);

  if (!mode || !meta || dismissed) return null;

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_PREFIX + mode, "1"); } catch { /* ignore */ }
    setDismissed(true);
  };

  // Show the 4 highest-signal modules for this persona. Anything else
  // stays one click away in the rest of the dashboard — we explicitly say
  // so to avoid the "did I just lose features?" anxiety.
  const modules = meta.modules.slice(0, 4);

  return (
    <section
      aria-label={`Welcome to ${meta.label} mode`}
      className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-card p-5"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss welcome"
        className="absolute top-3 right-3 inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground transition"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] font-semibold text-primary">
        <Sparkles className="h-3 w-3" /> Welcome
      </p>
      <h2 className="font-display text-lg sm:text-xl font-semibold tracking-tight text-foreground mt-1">
        You're in {meta.label} mode
      </h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-xl">
        You'll primarily use these four. <span className="text-foreground/80">Everything else stays available</span> — we just lead with what matters most for how you work.
      </p>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {modules.map((m) => {
          const { href, external } = resolveModuleHref(m.to);
          const cls = "group flex items-start gap-3 rounded-xl border border-border bg-background/60 hover:border-primary/40 hover:bg-background transition px-3 py-2";
          const body = (
            <>
              <span className="h-1.5 w-1.5 mt-1.5 rounded-full bg-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{m.label}</p>
                <p className="text-xs text-muted-foreground truncate">{m.desc}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition shrink-0 mt-1" />
            </>
          );
          return (
            <li key={m.to}>
              {external ? (
                <a href={href} className={cls}>{body}</a>
              ) : (
                <Link to={href} className={cls}>{body}</Link>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={dismiss}
        className="mt-4 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        Dismiss forever
      </button>
    </section>
  );
}
