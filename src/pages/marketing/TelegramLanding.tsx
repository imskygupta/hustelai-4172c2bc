import { SEO } from "@/components/SEO";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Send, Zap, Shield, Bell, FileDown, Crown } from "lucide-react";
import { Link } from "react-router-dom";

const FEATURES = [
  { icon: Bell, title: "Real-time alerts", desc: "Payments, AI tasks, leads, and security events delivered the moment they happen." },
  { icon: FileDown, title: "Telegram delivery", desc: "Resumes, invoices, proposals and reports sent straight to your chat — no email lag." },
  { icon: Zap, title: "Instant resends", desc: "Files cached on Telegram CDN. Re-download in milliseconds, no regeneration." },
  { icon: Shield, title: "Secure binding", desc: "One-time deep links, single-account-per-user, OTP-protected downloads." },
];

export default function TelegramLanding() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Telegram Delivery for HustleAI — Real-time Workspace Alerts"
        description="Connect Telegram to HustleAI to receive payments, AI exports, lead alerts and security events directly in your chat. Premium SaaS-grade delivery infrastructure."
        path="/integrations/telegram"
      />
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium mb-4">
          <Send className="h-4 w-4" /> Telegram Integration
        </div>
        <h1 className="text-4xl md:text-6xl font-display font-semibold tracking-tight">
          Your workspace, <span className="text-emerald-500">in your pocket.</span>
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
          HustleAI uses Telegram as a real-time delivery layer for your generated files,
          payments, AI tasks and security events. Premium SaaS infrastructure — built for freelancers.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/settings/integrations" className="rounded-md bg-emerald-500 text-white text-sm px-5 py-2.5 font-medium hover:bg-emerald-600">Connect Telegram</Link>
          <Link to="/pricing" className="rounded-md border border-border text-sm px-5 py-2.5 font-medium hover:bg-muted">View pricing</Link>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-14">
          {FEATURES.map(f => (
            <div key={f.title} className="rounded-xl border border-border/60 p-5 bg-card">
              <f.icon className="h-5 w-5 text-emerald-500 mb-3" />
              <h3 className="font-medium">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        <section className="mt-16 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 flex items-start gap-4">
          <Crown className="h-5 w-5 text-amber-500 mt-1" />
          <div>
            <h3 className="font-medium">Premium feature</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Telegram delivery is included on Pro, Elite and Infinity. Free users get a 7-day temporary export window.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}