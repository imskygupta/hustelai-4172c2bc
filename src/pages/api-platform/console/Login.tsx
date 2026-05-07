import { SignIn } from "@clerk/clerk-react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AuthShell, clerkAppearance } from "./AuthShell";

export default function ConsoleLogin() {
  return (
    <>
      <Helmet>
        <title>Sign in — HustleAI Console</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <AuthShell
        headline="Build AI products in days, not months."
        eyebrow="Welcome back"
        title="Sign in to your console"
        subtitle="Manage API keys, monitor usage, and ship with confidence."
        footer={
          <span>
            New to HustleAI?{" "}
            <Link to="/console/signup" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Create an account
            </Link>
          </span>
        }
      >
        <SignIn
          routing="path"
          path="/console/login"
          signUpUrl="/console/signup"
          afterSignInUrl="/console/dashboard"
          appearance={clerkAppearance}
        />
      </AuthShell>
    </>
  );
}