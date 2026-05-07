import { ReactNode } from "react";
import { SignedIn, SignedOut, ClerkLoaded, ClerkLoading, RedirectToSignIn } from "@clerk/clerk-react";
import { Loader2 } from "lucide-react";

export function RequireConsoleAuth({ children }: { children: ReactNode }) {
  return (
    <>
      <ClerkLoading>
        <div className="min-h-screen grid place-items-center bg-[#05070a] text-zinc-300">
          <div className="text-center space-y-3">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400 mx-auto" />
            <div className="text-[12px] text-zinc-500">Authenticating…</div>
          </div>
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <SignedOut>
          <RedirectToSignIn redirectUrl="/console/login" />
        </SignedOut>
        <SignedIn>{children}</SignedIn>
      </ClerkLoaded>
    </>
  );
}