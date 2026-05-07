/**
 * Centralized route constants for the API platform.
 * The developer console lives on its own subdomain in production:
 *   console.api.hustlaiapp.in
 * In dev / preview / single-domain hosts it lives at /console/* on the
 * current origin so we don't 404 across environments.
 */
function consoleBase(): string {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname || "";
  // Already on console subdomain — use relative paths.
  if (/^console\.api\./i.test(host)) return "";
  // On the marketing API subdomain in production — point cross-subdomain.
  if (/^api\.hustlaiapp\.in$/i.test(host)) return "https://console.api.hustlaiapp.in";
  // Dev, lovable preview, custom hosts — stay on same origin.
  return "";
}

export function consoleUrl(path: "/console/login" | "/console/signup" | "/console/dashboard") {
  return `${consoleBase()}${path}`;
}

export const API_PLATFORM_ROUTES = {
  login: () => consoleUrl("/console/login"),
  signup: () => consoleUrl("/console/signup"),
  dashboard: () => consoleUrl("/console/dashboard"),
} as const;