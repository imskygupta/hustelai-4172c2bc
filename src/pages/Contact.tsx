import { Navbar } from "@/components/Navbar";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MessageSquare, MapPin } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

import { SEO } from "@/components/SEO";

export default function Contact() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      toast({ title: "Message sent!", description: "We'll get back to you within 24 hours." });
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Contact HustleAI Workspace OS" description="Get in touch with the HustleAI Workspace OS team. Support, sales and partnerships." path="/contact" />
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 mb-12"
          >
            <h1 className="text-4xl md:text-6xl font-display font-bold">
              Get in <span className="text-gradient">Touch</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Have questions? We'd love to hear from you.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              {[
                { icon: Mail, label: "Email", value: "hustlaiapp@zohomail.in" },
                { icon: MessageSquare, label: "Support", value: "24/7 Live Chat" },
                { icon: MapPin, label: "Location", value: "Prayagraj, Uttar Pradesh, India" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="font-display font-semibold">{item.value}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.form
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleSubmit}
              className="glass rounded-xl p-6 space-y-4"
            >
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="Your name" required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="you@example.com" required />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea placeholder="Tell us what you need..." rows={4} required />
              </div>
              <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground" disabled={loading}>
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </motion.form>
          </div>
        </div>
      </div>
    </div>
  );
}
