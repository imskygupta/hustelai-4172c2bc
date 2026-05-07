import { SignUp } from "@clerk/clerk-react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AuthShell, clerkAppearance } from "./AuthShell";

export default function ConsoleSignup() {
  return (
    <>
      <Helmet>
        <title>Create account — HustleAI Console</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <AuthShell
        headline="Build AI products in days, not months."
        eyebrow="Get started free"
        title="Create your developer account"
        subtitle="50,000 API calls on us. No credit card required."
        footer={
          <span>
            Already have an account?{" "}
            <Link to="/console/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Sign in
            </Link>
          </span>
        }
      >
        <SignUp
          routing="path"
          path="/console/signup"
          signInUrl="/console/login"
          afterSignUpUrl="/console/dashboard"
          appearance={clerkAppearance}
        />
      </AuthShell>
    </>
  );
}