import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";

export default function PrivacyPolicy() {
  return (
    <PageTransition>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl prose prose-invert">
          <h1 className="text-3xl font-display font-bold text-foreground mb-8">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm mb-4">Last updated: March 8, 2026</p>

          <section className="space-y-4 text-muted-foreground text-sm leading-relaxed">
            <h2 className="text-lg font-display font-semibold text-foreground">1. Information We Collect</h2>
            <p>When you use HustleAI, we collect information you provide directly to us, including your name, email address, and any other information you choose to provide. We also collect usage data such as pages visited, features used, and search queries.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">2. How We Use Your Information</h2>
            <p>We use the information we collect to provide, maintain, and improve our services, personalize your experience, send you notifications and updates, process payments, and respond to your inquiries.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">3. Data Storage & Security</h2>
            <p>Your data is stored securely using industry-standard encryption. We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">4. Cookies</h2>
            <p>We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or indicate when a cookie is being sent.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">5. Third-Party Services</h2>
            <p>We may employ third-party companies and individuals for payment processing (Cashfree), analytics, and AI-powered features. These third parties have access to your personal information only to perform these tasks on our behalf.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">6. Data Retention</h2>
            <p>We retain your personal data only for as long as necessary to provide you with our services and as described in this Privacy Policy. We will also retain and use your information to comply with legal obligations.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">7. Your Rights</h2>
            <p>You have the right to access, update, or delete your personal information at any time through your account settings. You may also request a copy of your data or ask us to restrict processing.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">8. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.</p>

            <h2 className="text-lg font-display font-semibold text-foreground">9. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at:</p>
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
