import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

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
    <footer className="border-t border-border/50 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <span className="font-display font-bold text-lg">HustleAI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered freelance discovery platform. Find your next income stream in seconds.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h4 className="font-display font-semibold text-sm">Quick Links</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <Link to="/explore" className="hover:text-primary transition-colors">Explore</Link>
              <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
              <Link to="/about" className="hover:text-primary transition-colors">About</Link>
              <Link to="/reviews" className="hover:text-primary transition-colors">Reviews</Link>
              <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
              <Link to="/signup" className="hover:text-primary transition-colors">Sign Up</Link>
            </div>
          </div>

          {/* Newsletter */}
          <div className="space-y-3">
            <h4 className="font-display font-semibold text-sm">Stay in the Loop</h4>
            <p className="text-xs text-muted-foreground">
              Get weekly freelancing tips, trending gigs, and exclusive offers.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="h-9 text-sm"
                required
              />
              <Button type="submit" size="sm" className="bg-gradient-primary text-primary-foreground shrink-0" disabled={loading}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-border/50 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 HustleAI. All rights reserved.</p>
          <p>AI-powered freelance discovery.</p>
        </div>
      </div>
    </footer>
  );
}
