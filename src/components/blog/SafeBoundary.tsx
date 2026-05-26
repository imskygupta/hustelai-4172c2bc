import { Component, type ReactNode } from "react";

/**
 * Production-safe error boundary for blog content.
 *
 * Public blog pages must NEVER hard-crash into the global
 * "Something went sideways" fallback — that destroys SEO trust,
 * AdSense trust, and crawler stability on hero URLs.
 *
 * Any rendering error inside a SafeBoundary is contained and
 * replaced with `fallback` (defaults to `null`, i.e. silently
 * degrade the affected section).
 */
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional label for console diagnostics. */
  label?: string;
  /** Called on caught error — used by the page-level boundary to
   *  switch to a degraded full-page fallback. */
  onError?: (err: unknown) => void;
}

interface State { failed: boolean }

export class SafeBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    try {
      // eslint-disable-next-line no-console
      console.error(`[SafeBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error);
    } catch { /* swallow */ }
    this.props.onError?.(error);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
