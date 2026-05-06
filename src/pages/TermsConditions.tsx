import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { SEO } from "@/components/SEO";
import { Scale } from "lucide-react";
import { BRAND, SUPPORT_EMAIL } from "@/config/branding";

export default function TermsConditions() {
  return (
    <PageTransition>
            <SEO title="Terms & Conditions | HustleAI Workspace OS" description="Terms of use for the HustleAI Workspace OS platform." path="/terms-conditions" />
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <header className="mb-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Scale className="w-3.5 h-3.5" /> Legal
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-foreground">Terms & Conditions</h1>
            <p className="text-sm text-muted-foreground">Last updated: May 6, 2026</p>
          </header>

          <article className="rounded-2xl border border-border bg-card shadow-sm p-6 md:p-10 space-y-8 text-sm md:text-[0.95rem] leading-relaxed text-muted-foreground">
            {[
              { h: "1. Acceptance of Terms", p: `By accessing or using ${BRAND.name} (${BRAND.domain}), you agree to be bound by these Terms. If you do not agree, please do not use the platform.` },
              { h: "2. Description of Service", p: `${BRAND.name} is a SaaS workflow platform — a freelancer workspace and productivity software for managing clients, projects, documents, invoices, portals and AI-assisted operations.` },
              { h: "3. User Accounts", p: "You are responsible for the security of your account credentials and for all activity under your account. You must provide accurate information and be at least 18 years old to register." },
              { h: "4. Subscription Plans", p: "We offer Free, Pro (₹450/mo), Elite (₹900/mo), and Infinity (₹2,250/mo) plans, plus pay-as-you-go AI assist credits. Subscriptions renew automatically on a monthly cycle until cancelled. Features and pricing may change with prior notice." },
              { h: "5. Cancellation", p: "You can cancel your subscription at any time from your billing settings. Cancellation stops future renewals; the current paid period remains active until its end date." },
              { h: "6. Acceptable Use", p: "You agree not to use the platform for unlawful activity, to send spam, to attempt unauthorised access, to abuse AI assists, or to interfere with platform availability or other users." },
              { h: "7. Intellectual Property", p: `All product code, branding and content of ${BRAND.name} are owned by us. You retain ownership of content you create inside your workspace.` },
              { h: "8. Limitation of Liability", p: `${BRAND.name} is provided on an "as is" basis. To the maximum extent permitted by law, we are not liable for indirect, incidental or consequential damages arising from use of the platform.` },
              { h: "9. Termination", p: "We may suspend or terminate accounts that violate these terms, abuse the service, or pose a security risk to other users." },
              { h: "10. Governing Law", p: "These terms are governed by and construed in accordance with the laws of India. Disputes will be subject to the courts of Prayagraj, Uttar Pradesh." },
            ].map((s) => (
              <section key={s.h} className="space-y-2">
                <h2 className="text-base md:text-lg font-display font-semibold text-foreground">{s.h}</h2>
                <p>{s.p}</p>
              </section>
            ))}

            <section className="space-y-2 pt-4 border-t border-border">
              <h2 className="text-base md:text-lg font-display font-semibold text-foreground">11. Contact</h2>
              <p>For questions about these terms, contact <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline font-medium">{SUPPORT_EMAIL}</a>.</p>
              <p className="text-xs">{BRAND.name} · Prayagraj, Uttar Pradesh, India</p>
            </section>
          </article>
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
}
