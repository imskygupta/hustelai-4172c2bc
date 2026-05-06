import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";

import { SEO } from "@/components/SEO";

export default function TermsConditions() {
  return (
    <PageTransition>
            <SEO title="Terms & Conditions | HustleAI Workspace OS" description="Terms of use for the HustleAI Workspace OS platform." path="/terms-conditions" />
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl prose prose-invert">
          <h1 className="text-3xl font-display font-bold text-foreground mb-8">Terms & Conditions</h1>
          <p className="text-muted-foreground text-sm mb-4">Last updated: March 8, 2026</p>

          <section className="space-y-4 text-muted-foreground text-sm leading-relaxed">
            <h2 className="text-lg font-display font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing or using HustleAI (hustlaiapp.in), you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">2. Description of Service</h2>
            <p>HustleAI is an AI-powered platform that helps users discover, start, and grow side hustles and freelance opportunities. We offer free and premium subscription tiers with varying features.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">3. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate information during registration. You must be at least 18 years old to create an account.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">4. Subscription Plans</h2>
            <p>HustleAI offers Pro (₹450/mo), Elite (₹900/mo), and Infinity (₹2,250/mo) plans. Subscriptions are billed monthly. Features and pricing are subject to change with prior notice.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">5. User Conduct</h2>
            <p>You agree not to use the platform for any unlawful purpose, post spam or misleading content, attempt to gain unauthorized access to other accounts, or interfere with the platform's functionality.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">6. Intellectual Property</h2>
            <p>All content, features, and functionality of HustleAI are owned by us and protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without permission.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">7. Marketplace</h2>
            <p>Products and services listed on the HustleAI Marketplace are provided by third-party sellers. HustleAI acts as a facilitator and is not responsible for the quality or delivery of marketplace items.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">8. Limitation of Liability</h2>
            <p>HustleAI is provided "as is" without warranty. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">9. Termination</h2>
            <p>We reserve the right to suspend or terminate your account at our discretion if you violate these terms, without prior notice or liability.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">10. Governing Law</h2>
            <p>These terms shall be governed by and construed in accordance with the laws of India.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">11. Contact</h2>
            <p>For questions about these terms, contact us at:</p>
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
