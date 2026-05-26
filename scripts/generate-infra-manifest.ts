// Build-time auto-discovery for the Platform Registry.
// Parses src/App.tsx for <Route path="…"> entries and lists
// supabase/functions/* + public/*.xml endpoints. Emits a single
// JSON manifest consumed at runtime by the admin Platform Registry.
// Runs via predev / prebuild so it always reflects the current tree.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = process.cwd();
const OUT_DIR = resolve(ROOT, "src/generated");
const OUT_FILE = join(OUT_DIR, "infra-manifest.json");

type RouteEntry = {
  path: string;
  source: string;
  type: "public" | "admin" | "auth" | "workspace" | "docs" | "blog" | "internal" | "redirect";
  authWrapper: string | null;
  dynamic: boolean;
  catchAll: boolean;
};

function classify(path: string, wrapper: string | null): RouteEntry["type"] {
  if (path.startsWith("/admin") || path.includes("imskygupta-admin")) return "admin";
  if (path.startsWith("/docs")) return "docs";
  if (path.startsWith("/insights") || path.startsWith("/blog")) return "blog";
  if (path.startsWith("/workspace") || path.startsWith("/work")) return "workspace";
  if (wrapper && /Require|Protected|Auth/.test(wrapper)) return "auth";
  if (path === "*" || path.includes("not-found")) return "internal";
  return "public";
}

function scanRoutes(): RouteEntry[] {
  const src = readFileSync(resolve(ROOT, "src/App.tsx"), "utf8");
  const routeRe = /<Route\s+(?:[^>]*?\s)?path=(?:"([^"]+)"|\{([^}]+)\})([^>]*)>/g;
  const seen = new Set<string>();
  const out: RouteEntry[] = [];
  let m: RegExpExecArray | null;
  while ((m = routeRe.exec(src))) {
    const path = (m[1] || "").trim();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const rest = m[3] || "";
    const wrapperMatch = rest.match(/element=\{<(\w+)/);
    const wrapper = wrapperMatch ? wrapperMatch[1] : null;
    const isRedirect = rest.includes("<Navigate");
    out.push({
      path,
      source: "src/App.tsx",
      type: isRedirect ? "redirect" : classify(path, wrapper),
      authWrapper: wrapper,
      dynamic: path.includes(":"),
      catchAll: path.includes("*"),
    });
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

function scanEdgeFunctions(): { name: string; source: string }[] {
  const dir = resolve(ROOT, "supabase/functions");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => !n.startsWith("_") && statSync(join(dir, n)).isDirectory() && existsSync(join(dir, n, "index.ts")))
    .sort()
    .map((name) => ({ name, source: `supabase/functions/${name}/index.ts` }));
}

function scanPublicEndpoints(): { path: string; kind: string }[] {
  const dir = resolve(ROOT, "public");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.(xml|txt)$/i.test(f))
    .sort()
    .map((f) => ({
      path: `/${f}`,
      kind: f.endsWith(".xml") ? "sitemap" : f === "robots.txt" ? "robots" : "verification",
    }));
}

const manifest = {
  generated_at: new Date().toISOString(),
  routes: scanRoutes(),
  edge_functions: scanEdgeFunctions(),
  public_endpoints: scanPublicEndpoints(),
};

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `[infra-manifest] wrote ${manifest.routes.length} routes, ${manifest.edge_functions.length} functions, ${manifest.public_endpoints.length} static endpoints`,
);