import { Component, ReactNode, useEffect, useState } from "react";
import { ClerkProvider, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { ArrowRight } from "lucide-react";
import { API_PLATFORM_ROUTES } from "@/lib/apiPlatformRoutes";

const CLERK_PUBLISHABLE_KEY =
  (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined) ||
  "pk_live_Y2xlcmsuYXBpLmh1c3RsYWlhcHAuaW4k";

/** Catches Clerk init crashes so marketing page never goes blank. */
class CtaBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) { console.warn("[ApiPlatform CTA] clerk failed:", err?.message); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

function SkeletonBtn({ w = "w-20" }: { w?: string }) {
  return <span className={`inline-block h-8 ${w} rounded-md bg-white/[0.05] animate-pulse`} />;
}

function StaticFallback({ size = "sm" }: { size?: "sm" | "lg" }) {
  const pad = size === "lg" ? "px-5 py-2.5 text-sm" : "px-3 py-1.5 text-[13px]";
  return (
    <>
      <a
        href={API_PLATFORM_ROUTES.login()}
        className={`inline-flex items-center rounded-md ring-1 ring-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.06] hover:ring-white/20 transition ${pad}`}
      >
        Sign in
      </a>
      <a
        href={API_PLATFORM_ROUTES.signup()}
        className={`inline-flex items-center gap-1 rounded-md bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition ${pad}`}
      >
        Get API key <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </>
  );
}

/** The actual auth-aware buttons. Wrapped in ClerkProvider lazily. */
function ClerkAwareCTAs({ size = "sm" }: { size?: "sm" | "lg" }) {
  const pad = size === "lg" ? "px-5 py-2.5 text-sm" : "px-3 py-1.5 text-[13px]";
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setInterval(() => {
      if ((window as any).Clerk?.loaded) { setReady(true); window.clearInterval(t); }
    }, 200);
    const timeout = window.setTimeout(() => { setReady(true); window.clearInterval(t); }, 4000);
    return () => { window.clearInterval(t); window.clearTimeout(timeout); };
  }, []);

  if (!ready) {
    return (
      <>
        <SkeletonBtn w="w-16" />
        <SkeletonBtn w="w-28" />
      </>
    );
  }
  return (
    <>
      <SignedOut>
        <a
          href={API_PLATFORM_ROUTES.login()}
          className={`inline-flex items-center rounded-md ring-1 ring-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.06] hover:ring-white/20 transition ${pad}`}
        >
          Sign in
        </a>
        <a
          href={API_PLATFORM_ROUTES.signup()}
          className={`inline-flex items-center gap-1 rounded-md bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition ${pad}`}
        >
          Get API key <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </SignedOut>
      <SignedIn>
        <a
          href={API_PLATFORM_ROUTES.dashboard()}
          className={`inline-flex items-center gap-1 rounded-md bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition ${pad}`}
        >
          Open Console <ArrowRight className="h-3.5 w-3.5" />
        </a>
        <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
      </SignedIn>
    </>
  );
}

/**
 * Drop-in auth-aware CTA pair for the API marketing page.
 * Mounts ClerkProvider locally and falls back to static links if Clerk fails.
 */
export function AuthAwareCTA({ size = "sm" }: { size?: "sm" | "lg" }) {
  return (
    <CtaBoundary fallback={<StaticFallback size={size} />}>
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        signInUrl={API_PLATFORM_ROUTES.login()}
        signUpUrl={API_PLATFORM_ROUTES.signup()}
        afterSignInUrl={API_PLATFORM_ROUTES.dashboard()}
        afterSignUpUrl={API_PLATFORM_ROUTES.dashboard()}
      >
        <ClerkAwareCTAs size={size} />
      </ClerkProvider>
    </CtaBoundary>
  );
}