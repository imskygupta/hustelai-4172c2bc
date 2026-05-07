import { SignIn } from "@clerk/clerk-react";
import { Helmet } from "react-helmet-async";

export default function ConsoleLogin() {
  return (
    <>
      <Helmet>
        <title>Sign in — HustleAI Console</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="min-h-screen bg-[#05070a] text-zinc-200 grid place-items-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-emerald-500/15 border border-emerald-400/30 grid place-items-center text-emerald-300 font-mono text-[12px]">H</div>
              <div className="text-left">
                <div className="text-[14px] font-semibold text-zinc-100 leading-tight">HustleAI</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-400/80">Console · Beta</div>
              </div>
            </div>
          </div>
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/signup"
            afterSignInUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "bg-white/[0.02] border border-white/[0.08] shadow-none",
              },
            }}
          />
        </div>
      </div>
    </>
  );
}