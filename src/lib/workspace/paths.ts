/**
 * Workspace path helper.
 *
 * On the workspace subdomain (workspace.hustlaiapp.in) the cockpit lives at
 * the root: `/`, `/projects/:id`, `/providers`, `/clients`, etc. The
 * subdomain itself defines the product context, so URLs stay clean and
 * operational.
 *
 * On the marketing host and dual hosts (lovable preview / localhost) we keep
 * the legacy `/workspaces/*` tree so dev preview and any cross-host link
 * still resolve. Both hosts share the same React component tree, so every
 * <Link>/<NavLink>/navigate() call routes through `wp(rel)` to pick the
 * correct shape.
 */
import { isWorkspaceHost } from "@/lib/host";

const LEGACY_RENAME: Record<string, string> = {
  "": "",
  "providers": "ai-settings",
  "projects/new": "new",
};

/**
 * `rel` is the *clean* relative path inside the workspace cockpit.
 * Examples: "" (overview), "projects/new", "providers", "pipeline",
 * "projects/abc-123", "projects/abc-123/docs", "intake/x".
 */
export function wp(rel: string): string {
  const r = rel.replace(/^\/+/, "");
  if (isWorkspaceHost()) {
    return r ? `/${r}` : "/";
  }
  // Legacy `/workspaces/*` shape for marketing + dual hosts.
  if (r in LEGACY_RENAME) {
    const mapped = LEGACY_RENAME[r];
    return mapped ? `/workspaces/${mapped}` : "/workspaces";
  }
  // projects/:id[/...] -> /workspaces/:id[/...]
  const m = r.match(/^projects\/(.+)$/);
  if (m) return `/workspaces/${m[1]}`;
  return `/workspaces/${r}`;
}

/** Convenience: cockpit root (Overview). */
export const wpRoot = () => wp("");
/** Convenience: a project's detail page. */
export const wpProject = (id: string) => wp(`projects/${id}`);
/** Convenience: a project's docs list. */
export const wpProjectDocs = (id: string) => wp(`projects/${id}/docs`);
/** Convenience: a specific doc inside a project. */
export const wpProjectDoc = (id: string, docId: string) => wp(`projects/${id}/docs/${docId}`);
/** Convenience: new doc of a given type inside a project. */
export const wpProjectDocNew = (id: string, type: string) => wp(`projects/${id}/docs/new/${type}`);