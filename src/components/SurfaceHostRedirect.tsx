/**
 * Cross-host redirector — DISABLED.
 *
 * The workspace.hustlaiapp.in subdomain is now treated as an entirely
 * separate product surface (its own deployment + its own codebase). The
 * main app must NOT auto-redirect users into it: doing so caused the
 * Supabase session on hustlaiapp.in to appear "lost" on the subdomain,
 * which forced unexpected logouts and panic. From the main domain,
 * workspace is just an external link (like the docs button), nothing more.
 *
 * Component kept as a no-op so `App.tsx` keeps compiling without churn.
 */
export function SurfaceHostRedirect() {
  return null;
}