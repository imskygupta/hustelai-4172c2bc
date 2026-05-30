import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Returns true when floating launchers (mascot, chatbot bubble, etc.)
 * should hide themselves so they don't collide with critical UI.
 *
 * Suppress when:
 *   - On auth / onboarding routes (login, signup, /auth*, /verify*, /onboarding)
 *   - A Radix Dialog / Sheet / AlertDialog is open
 *     (Radix sets data-state="open" on its [role=dialog] portal nodes)
 *   - The Command Palette / cmdk listbox is open
 *   - The on-screen keyboard is open on mobile
 *     (visualViewport height shrinks vs window.innerHeight by > 150px)
 */
const AUTH_PREFIXES = [
  "/login",
  "/signup",
  "/auth",
  "/verify",
  "/onboarding",
  "/reset-password",
  "/forgot-password",
];

function pathSuppressed(pathname: string) {
  return AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function anyOverlayOpen(): boolean {
  if (typeof document === "undefined") return false;
  // Radix Dialog / Sheet / AlertDialog all render a [role=dialog] node
  // with data-state="open" once mounted. Popover & DropdownMenu also use
  // the same convention but are typically small + non-bottom-anchored,
  // so we only suppress for full dialogs / sheets.
  const dialog = document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
  );
  if (dialog) return true;
  // cmdk command palette
  const cmdk = document.querySelector('[cmdk-root]');
  if (cmdk) return true;
  return false;
}

function keyboardOpen(): boolean {
  if (typeof window === "undefined") return false;
  const vv = window.visualViewport;
  if (!vv) return false;
  return window.innerHeight - vv.height > 150;
}

export function useFloatingLauncherSuppressed(): boolean {
  const { pathname } = useLocation();
  const [overlay, setOverlay] = useState(false);
  const [kb, setKb] = useState(false);

  // Observe overlay presence with a MutationObserver scoped to body.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setOverlay(anyOverlayOpen());
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "role"],
    });
    return () => obs.disconnect();
  }, []);

  // Visual viewport resize → keyboard heuristic.
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const update = () => setKb(keyboardOpen());
    update();
    window.visualViewport.addEventListener("resize", update);
    return () => window.visualViewport?.removeEventListener("resize", update);
  }, []);

  return pathSuppressed(pathname) || overlay || kb;
}