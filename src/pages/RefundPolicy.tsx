import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { AlertTriangle } from "lucide-react";

export default function RefundPolicy() {
  return (
    <PageTransition>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl prose prose-invert">
          <h1 className="text-3xl font-display font-bold text-foreground mb-8">Refund Policy</h1>
          <p className="text-muted-foreground text-sm mb-4">Last updated: March 8, 2026</p>

          <div className="glass rounded-xl p-6 border-destructive/30 mb-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-display font-bold text-foreground mb-2">No Refund Policy</h3>
                <p className="text-sm text-muted-foreground">Due to the digital and online nature of our services, <strong className="text-foreground">all sales are final and non-refundable</strong>. Once a payment is processed and access is granted, we cannot issue refunds.</p>
              </div>
            </div>
          </div>

          <section className="space-y-4 text-muted-foreground text-sm leading-relaxed">
            <h2 className="text-lg font-display font-semibold text-foreground">1. Digital Services</h2>
            <p>HustleAI provides digital services including AI-powered hustle discovery, community access, expert guidance, marketplace access, and premium features. Since these services are delivered instantly upon payment, they cannot be "returned" in the traditional sense.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">2. Subscription Plans</h2>
            <p>All subscription plans (Pro, Elite, Infinity) are non-refundable once payment is processed. You will continue to have access to your plan's features until the end of the billing period. You may cancel your subscription at any time to prevent future charges.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">3. Marketplace Purchases</h2>
            <p>All marketplace purchases (templates, tools, courses, subscriptions) are non-refundable. Please review product descriptions carefully before purchasing. If you encounter a technical issue with a digital product, contact us for support.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">4. Exceptions</h2>
            <p>In rare cases, we may consider a refund or credit at our sole discretion if:</p>
            <ul className="list-disc pl-5">
              <li>You were charged multiple times for the same transaction due to a technical error</li>
              <li>The service was completely unavailable for an extended period during your subscription</li>
              <li>A fraudulent transaction occurred on your account</li>
            </ul>

            <h2 className="text-lg font-display font-semibold text-foreground">5. Disputes</h2>
            <p>If you believe a charge was made in error, please contact us within 7 days of the transaction. We will review your case and respond within 3–5 business days.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">6. Contact for Billing Issues</h2>
            <p>For any billing-related questions or disputes, reach out to us at:</p>
            <ul className="list-disc pl-5">
              <li>Email: <a href="mailto:hustlaiapp@zohomail.in" className="text-primary hover:underline">hustlaiapp@zohomail.in</a></li>
              <li>Support: <a href="mailto:hustlaiapp@zohomail.in" className="text-primary hover:underline">hustlaiapp@zohomail.in</a></li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </PageTransition>
  );
}
