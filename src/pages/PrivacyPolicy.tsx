import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { SEO } from "@/components/SEO";
import { ShieldCheck } from "lucide-react";
import { BRAND, SUPPORT_EMAIL } from "@/config/branding";

export default function PrivacyPolicy() {
  return (
    <PageTransition>
            <SEO title="Privacy Policy | HustleAI Workspace OS" description="How HustleAI Workspace OS collects, uses and protects your data." path="/privacy-policy" />
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <header className="mb-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> Legal
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-foreground">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: May 6, 2026</p>
          </header>

          <article className="rounded-2xl border border-border bg-card shadow-sm p-6 md:p-10 space-y-8 text-sm md:text-[0.95rem] leading-relaxed text-muted-foreground">
            {[
              { h: "1. Information We Collect", p: `When you use ${BRAND.name}, we collect information you provide directly — including your name, email address, profile details, and any content you create inside your workspace. We also collect operational data such as feature usage, document exports, and AI assist counts to improve reliability and security.` },
              { h: "2. How We Use Your Information", p: "We use your information to operate and improve the workspace platform, personalise your experience, deliver notifications and product updates, process subscription payments, enforce usage limits, and respond to support requests." },
              { h: "3. Data Storage & Security", p: "Your data is stored on managed cloud infrastructure with encryption in transit and at rest. Access is gated by row-level security policies, scoped API tokens, and audited admin controls." },
              { h: "4. Cookies", p: "We use a small number of cookies and similar technologies for authentication, session continuity, and product analytics. You can disable non-essential cookies through your browser settings." },
              { h: "5. Third-Party Services", p: "We rely on selected third-party providers for payment processing (Dodo Payments), transactional email, analytics, and AI inference. These providers receive only the data required to perform their function and operate under their own data protection obligations." },
              { h: "6. Data Retention", p: "We retain personal data for as long as your account is active or as required to comply with legal, accounting, and operational obligations. You can request deletion of your account and associated personal data at any time." },
              { h: "7. Your Rights", p: "You can access, update, export or delete your personal information from inside your account. For deletion or data-portability requests that cannot be completed in-app, contact our support team." },
              { h: "8. Changes to This Policy", p: "We may update this policy as the platform evolves. Material changes will be communicated by email or in-app notification, and the 'Last updated' date above will always reflect the current version." },
            ].map((s) => (
              <section key={s.h} className="space-y-2">
                <h2 className="text-base md:text-lg font-display font-semibold text-foreground">{s.h}</h2>
                <p>{s.p}</p>
              </section>
            ))}

            <section className="space-y-2 pt-4 border-t border-border">
              <h2 className="text-base md:text-lg font-display font-semibold text-foreground">9. Contact</h2>
              <p>For privacy questions or data requests, contact us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline font-medium">{SUPPORT_EMAIL}</a>.</p>
              <p className="text-xs">{BRAND.name} · Prayagraj, Uttar Pradesh, India</p>
            </section>
          </article>
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
}
