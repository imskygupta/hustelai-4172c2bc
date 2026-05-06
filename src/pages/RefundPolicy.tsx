import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { AlertTriangle, Receipt } from "lucide-react";
import { SEO } from "@/components/SEO";
import { BRAND, SUPPORT_EMAIL, BILLING_EMAIL } from "@/config/branding";

export default function RefundPolicy() {
  return (
    <PageTransition>
            <SEO title="Refund Policy | HustleAI Workspace OS" description="Refund policy for HustleAI Workspace OS subscriptions." path="/refund-policy" />
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <header className="mb-8 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Receipt className="w-3.5 h-3.5" /> Billing
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-foreground">Refund Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: May 6, 2026</p>
          </header>

          <div className="rounded-2xl p-5 md:p-6 mb-8 bg-destructive/5 border border-destructive/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm md:text-base font-display font-semibold text-foreground">No-refund policy on digital subscriptions</h3>
                <p className="text-sm text-muted-foreground">All subscription payments and AI assist credit purchases are <strong className="text-foreground">final and non-refundable</strong>. You can cancel renewals at any time and continue to use the platform until the end of the paid period.</p>
              </div>
            </div>
          </div>

          <article className="rounded-2xl border border-border bg-card shadow-sm p-6 md:p-10 space-y-8 text-sm md:text-[0.95rem] leading-relaxed text-muted-foreground">
            {[
              { h: "1. Digital Services", p: `${BRAND.name} delivers a SaaS workspace platform — workspaces, CRM, document generation, AI assists and client portals. Because access is provisioned instantly on payment, services are not returnable in the traditional sense.` },
              { h: "2. Subscription Plans", p: "Pro, Elite and Infinity subscriptions are non-refundable once charged. You can cancel renewal from billing settings; access continues until the current cycle ends." },
              { h: "3. AI Assist Credits", p: "Pay-as-you-go credits are non-refundable once issued to your account, including unused balances." },
            ].map((s) => (
              <section key={s.h} className="space-y-2">
                <h2 className="text-base md:text-lg font-display font-semibold text-foreground">{s.h}</h2>
                <p>{s.p}</p>
              </section>
            ))}

            <section className="space-y-2">
              <h2 className="text-base md:text-lg font-display font-semibold text-foreground">4. Limited Exceptions</h2>
              <p>At our sole discretion, we may issue a credit if:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>You were charged more than once for the same transaction due to a technical error.</li>
                <li>The platform was verifiably unavailable for an extended period during your active subscription.</li>
                <li>A fraudulent transaction occurred on your account and is confirmed by our payment processor.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base md:text-lg font-display font-semibold text-foreground">5. Disputes</h2>
              <p>Raise billing disputes within 7 days of the transaction. Our team reviews and responds within 3–5 business days.</p>
            </section>

            <section className="space-y-2 pt-4 border-t border-border">
              <h2 className="text-base md:text-lg font-display font-semibold text-foreground">6. Billing Contact</h2>
              <p>Billing: <a href={`mailto:${BILLING_EMAIL}`} className="text-primary hover:underline font-medium">{BILLING_EMAIL}</a></p>
              <p>Support: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline font-medium">{SUPPORT_EMAIL}</a></p>
              <p className="text-xs">{BRAND.name} · Prayagraj, Uttar Pradesh, India</p>
            </section>
          </article>
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
}
