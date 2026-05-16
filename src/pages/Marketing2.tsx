// Marketing Page 2 — for HustleAI Blogs ad campaigns.
// Hidden from site nav. Linked only from paid ads (blog acquisition).
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { track } from "@/lib/analytics";
import {
  ArrowRight, Sparkles, BookOpen, Brain, TrendingUp, Search,
  Bookmark, Bell, Star, Newspaper, Lightbulb,
} from "lucide-react";

const hooks = [
  "Smart freelancers read smarter.",
  "Get the playbooks the top 1% actually use.",
  "Side-hustle ideas that pay — not the recycled ones.",
];

const value = [
  { icon: Brain,        t: "AI-curated playbooks",   d: "Strategies vetted by our in-house intelligence layer — not random listicles." },
  { icon: TrendingUp,   t: "What's working now",     d: "Live trend signals from operators in India and the US." },
  { icon: Lightbulb,    t: "Real income breakdowns", d: "Numbers, tools, timelines. The unsexy truth nobody else publishes." },
  { icon: Search,       t: "Smart search",           d: "Ask in natural language. Get the exact section, not 40 tabs." },
  { icon: Bookmark,     t: "Save & build vault",     d: "Bookmark guides into your personal hustle vault." },
  { icon: Bell,         t: "Sunday Brief",           d: "One email a week. Best new playbook, top trend, one tool worth trying." },
];

const sample = [
  { tag: "Side hustle",    title: "How a 22-year-old in Pune built ₹2.4L/mo with AI ghostwriting", read: "9 min" },
  { tag: "Freelance",      title: "The proposal template that closes 1 in 3 cold leads",            read: "6 min" },
  { tag: "Tools",          title: "I tested 14 ‘all-in-one’ freelance apps. Only 2 are real.",      read: "11 min" },
  { tag: "Trend",          title: "Why agencies are quietly hiring solo operators in 2026",         read: "7 min" },
];

export default function Marketing2() {
  const nav = useNavigate();
  const [hookIdx, setHookIdx] = useState(0);

  useEffect(() => {
    track("marketing_page_viewed", { page: "marketing-2" });
    const t = setInterval(() => setHookIdx((i) => (i + 1) % hooks.length), 3500);
    return () => clearInterval(t);
  }, []);

  const goBlog = () => { track("marketing_cta_clicked", { page: "marketing-2" }); window.location.href = "https://blogs.hustlaiapp.in"; };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 overflow-x-hidden">
      <SEO title="Smart freelancer playbooks — HustleAI Blogs" description="AI-curated side-hustle and freelancing playbooks. Real income breakdowns. Sunday Brief in your inbox." path="/marketing-2" noIndex />

      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-amber-400/15 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] rounded-full bg-rose-400/15 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <header className="px-4 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="font-display font-bold text-lg">HustleAI <span className="text-muted-foreground">/ Blogs</span></div>
        <Button size="sm" variant="ghost" onClick={goBlog}>Read library</Button>
      </header>

      <section className="px-4 pt-10 pb-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <Badge className="bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-violet-500/20 border-primary/20 text-foreground px-4 py-1.5">
            <Newspaper className="w-3.5 h-3.5 mr-1.5 inline" /> 800+ playbooks · updated weekly
          </Badge>
          <motion.h1 key={hookIdx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.05]">
            <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-violet-500 bg-clip-text text-transparent">{hooks[hookIdx]}</span>
          </motion.h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Real income breakdowns, AI-curated playbooks, and the Sunday Brief that operators actually open.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button size="lg" onClick={goBlog} className="bg-gradient-to-r from-amber-500 via-rose-500 to-violet-500 text-white hover:opacity-90 shadow-2xl shadow-rose-500/20 px-8 h-12">
              Read the library <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => nav("/signup")} className="h-12 px-8">Get Sunday Brief</Button>
          </div>
          <p className="text-xs text-muted-foreground">Free · No spam · Unsubscribe anytime</p>
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <Badge variant="outline">Why this isn't another blog</Badge>
            <h2 className="text-3xl md:text-5xl font-display font-bold">Smart freelancers read smarter.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {value.map((v, i) => {
              const Icon = v.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                  whileHover={{ y: -6 }}
                  className="group rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-6 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/5 mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="font-display font-bold text-lg mb-2">{v.t}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{v.d}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <Badge variant="outline">A taste of the library</Badge>
            <h2 className="text-3xl md:text-5xl font-display font-bold">Recently published.</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {sample.map((s, i) => (
              <motion.button key={i} onClick={goBlog}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                whileHover={{ y: -4 }}
                className="text-left group rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-6 hover:border-primary/40 hover:shadow-xl transition-all">
                <Badge variant="outline" className="text-[10px] mb-3">{s.tag}</Badge>
                <h3 className="font-display font-bold text-lg leading-snug group-hover:text-primary transition-colors">{s.title}</h3>
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <BookOpen className="w-3.5 h-3.5" /> {s.read} read
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-32">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-violet-500/10 p-10 md:p-16 max-w-5xl mx-auto text-center space-y-6">
          <Sparkles className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-3xl md:text-5xl font-display font-bold">One email a week. Worth opening.</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">The Sunday Brief: best new playbook, top trend, one tool worth trying. That's it.</p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Button size="lg" onClick={() => nav("/signup")} className="bg-gradient-to-r from-amber-500 via-rose-500 to-violet-500 text-white hover:opacity-90 shadow-2xl px-8 h-12">
              Subscribe free <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button size="lg" variant="outline" onClick={goBlog} className="h-12 px-8">Browse library</Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
