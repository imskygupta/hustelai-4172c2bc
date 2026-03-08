import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Send, Mail, MapPin, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const productLinks = [
  { label: "Explore", href: "/explore" },
  { label: "Community", href: "/community" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Blog", href: "/blog" },
  { label: "Pricing", href: "/#pricing" },
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Company", href: "/company" },
  { label: "Careers", href: "/career" },
  { label: "Affiliates", href: "/affiliates" },
  { label: "Reviews", href: "/reviews" },
  { label: "Contact", href: "/contact" },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase
      .from("newsletter_subscribers" as any)
      .insert({ email: email.trim() } as any);
    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already subscribed!", description: "You're already on our list." });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Subscribed! 🎉", description: "You'll receive our best freelancing tips." });
      setEmail("");
    }
  };

  return (
    <footer className="border-t border-border/50 pt-16 pb-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary" />
              <span className="font-display font-bold text-xl">HustleAI</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI-powered freelance discovery platform. Find, start, and grow your next income stream.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
          <a href="mailto:contact@hustelai.eu.cc" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Mail className="w-4 h-4" /> contact@hustelai.eu.cc
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" /> India 🇮🇳
              </div>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm">Product</h4>
            <div className="space-y-2.5">
              {productLinks.map(l => (
                <Link key={l.href} to={l.href} className="block text-sm text-muted-foreground hover:text-primary transition-colors group">
                  {l.label} <ArrowUpRight className="w-3 h-3 inline opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm">Company</h4>
            <div className="space-y-2.5">
              {companyLinks.map(l => (
                <Link key={l.href} to={l.href} className="block text-sm text-muted-foreground hover:text-primary transition-colors group">
                  {l.label} <ArrowUpRight className="w-3 h-3 inline opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm">Stay in the Loop</h4>
            <p className="text-xs text-muted-foreground">
              Get weekly freelancing tips, trending gigs, and exclusive offers.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <Input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com" className="h-10 text-sm bg-secondary/50" required
              />
              <Button type="submit" size="sm" className="bg-gradient-primary text-primary-foreground shrink-0 h-10 px-4 btn-press" disabled={loading}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-border/50 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 HustleAI. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <span>·</span>
            <Link to="/terms-conditions" className="hover:text-primary transition-colors">Terms & Conditions</Link>
            <span>·</span>
            <Link to="/refund-policy" className="hover:text-primary transition-colors">Refund Policy</Link>
            <span>·</span>
            <a href="mailto:support@hustelai.eu.cc" className="hover:text-primary transition-colors">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
