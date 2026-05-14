export const APP_WEB_ORIGIN = "https://hustlaiapp.in";

export const AUTH_EMAIL_REDIRECT_TO = APP_WEB_ORIGIN;
export const RESET_PASSWORD_REDIRECT_TO = `${APP_WEB_ORIGIN}/reset-password`;

export function authRedirectTo(next = "/dashboard") {
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return `${APP_WEB_ORIGIN}/login?next=${encodeURIComponent(safeNext)}`;
}
