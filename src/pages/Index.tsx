import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { SearchBar } from "@/components/SearchBar";
import { Navbar } from "@/components/Navbar";
import { Pricing } from "@/components/Pricing";
import { Testimonials } from "@/components/Testimonials";
import { Footer } from "@/components/Footer";
import { ArrowRight, Zap, Brain, Target, TrendingUp, Shield, Globe, Check, X, BadgeCheck, Sparkles, Activity, Code2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const features = [
  { icon: Brain, title: "AI Match Engine", desc: "Tailored to your skills, budget, and goals — not generic listings." },
  { icon: BadgeCheck, title: "Verified by AI", desc: "Every opportunity is scored and validated. No scams, no dead ends." },
  { icon: TrendingUp, title: "Live Trend Pulse", desc: "Real-time trending gigs powered by continuous market analysis." },
  { icon: Activity, title: "Roadmap, Not a Link", desc: "Get a 3-step plan for each hustle — start today, scale tomorrow." },
  { icon: Globe, title: "Global + Indian Gigs", desc: "From Mercor & Outlier to local UPI side hustles." },
  { icon: Zap, title: "Seconds, Not Hours", desc: "Stop scrolling job boards. Get an answer in one prompt." },
];

const stats = [
  { value: "500+", label: "Hustle categories" },
  { value: "20+", label: "AI + Work tools" },
  { value: "₹0", label: "To start" },
  { value: "24/7", label: "AI on-call" },
];

const typingPrompts = [
  "Find me a side hustle for a Python dev with ₹0 budget...",
  "Best freelancing gigs for a college student in India...",
  "Remote AI jobs that pay in USD...",
  "Passive income ideas for a working professional...",
  "Faceless content niches trending in 2026...",
];

const comparison = [
  { feature: "Personalized to your exact skills", us: true, others: false },
  { feature: "AI-verified opportunities (not random links)", us: true, others: false },
  { feature: "3-step roadmap per hustle", us: true, others: false },
  { feature: "Source citations (Reddit, Twitter, real gigs)", us: true, others: false },
  { feature: "Built-in invoices, time tracker, CRM & client portals (free)", us: true, others: false },
  { feature: "Built-in pricing, proposal & resume tools", us: true, others: false },
  { feature: "Generic job board listings", us: false, others: true },
  { feature: "Hours of manual scrolling", us: false, others: true },
];

export default function Index() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState("");
  const [promptIdx, setPromptIdx] = useState(0);

  useEffect(() => {
    // Hero text entrance
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current.querySelectorAll(".gsap-fade"),
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: "power3.out" }
      );
    }
  }, []);

  // Typing animation for hero placeholder
  useEffect(() => {
    const current = typingPrompts[promptIdx];
    let i = 0;
    setTyped("");
    const typer = setInterval(() => {
      i++;
      setTyped(current.slice(0, i));
      if (i >= current.length) {
        clearInterval(typer);
        setTimeout(() => setPromptIdx((p) => (p + 1) % typingPrompts.length), 2200);
      }
    }, 45);
    return () => clearInterval(typer);
  }, [promptIdx]);

  const handleSearch = (query: string) => {
    navigate(`/explore?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(226 232 240 / 0.6) 1px, transparent 1px), linear-gradient(to bottom, rgb(226 232 240 / 0.6) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center top, black 30%, transparent 75%)",
          }}
        />
        {/* Soft accent glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-200/30 blur-3xl rounded-full pointer-events-none" />

        <div ref={heroRef} className="container mx-auto max-w-4xl text-center space-y-8 relative z-10">
          <div className="space-y-5">
            <div className="gsap-fade inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-600 text-xs shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              AI-Powered Hustle Discovery — Live in 2026
            </div>
            <h1 className="gsap-fade text-5xl md:text-7xl font-display font-semibold leading-[1.05] tracking-tight text-slate-900">
              The intelligence layer
              <br />
              for your <span className="text-emerald-600">side hustle.</span>
            </h1>
            <p className="gsap-fade text-base md:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Stop scrolling job boards. Tell HustleAI your skills, budget, and goals — get verified opportunities, AI-built roadmaps, and tools to land them. All in seconds.
            </p>
          </div>

          <div className="gsap-fade max-w-3xl mx-auto">
            <SearchBar
              onSearch={handleSearch}
              size="lg"
              variant="light"
              placeholder={typed + (typed.length < typingPrompts[promptIdx].length ? "▍" : "")}
            />
          </div>

          <div className="gsap-fade flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 pt-2">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Free forever tier</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Indian + global gigs</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-slate-200 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-display font-semibold text-slate-900">{stat.value}</div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-slate-50/50">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16 space-y-4"
          >
            <div className="text-xs uppercase tracking-[0.18em] text-emerald-600 font-medium">Built for hustlers</div>
            <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900">
              Everything you need.<br/>Nothing you don't.
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Six AI-native primitives that turn "what should I do?" into income.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                viewport={{ once: true }}
                className="bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center mb-4 group-hover:bg-emerald-500 transition-colors">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2 text-slate-900">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why we're better — comparison */}
      <section className="py-24 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12 space-y-4"
          >
            <div className="text-xs uppercase tracking-[0.18em] text-emerald-600 font-medium">The difference</div>
            <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900">
              Why HustleAI &gt; everything else
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Upwork, Fiverr, Reddit threads, blog listicles. None of them know <em>you</em>.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm"
          >
            <div className="grid grid-cols-[1fr_70px_70px] sm:grid-cols-[1fr_120px_120px] md:grid-cols-[1fr_160px_160px] bg-slate-50 border-b border-slate-200">
              <div className="p-3 sm:p-4 text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 font-medium">Capability</div>
              <div className="p-3 sm:p-4 text-center text-[10px] sm:text-xs uppercase tracking-wider text-emerald-600 font-semibold border-l border-slate-200">HustleAI</div>
              <div className="p-3 sm:p-4 text-center text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 font-medium border-l border-slate-200">Others</div>
            </div>
            {comparison.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-[1fr_70px_70px] sm:grid-cols-[1fr_120px_120px] md:grid-cols-[1fr_160px_160px] ${i !== comparison.length - 1 ? "border-b border-slate-100" : ""}`}
              >
                <div className="p-3 sm:p-4 text-xs sm:text-sm text-slate-700">{row.feature}</div>
                <div className="p-3 sm:p-4 flex items-center justify-center border-l border-slate-100">
                  {row.us ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                  ) : (
                    <X className="w-4 h-4 text-slate-300" />
                  )}
                </div>
                <div className="p-3 sm:p-4 flex items-center justify-center border-l border-slate-100">
                  {row.others ? (
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-slate-400" />
                    </div>
                  ) : (
                    <X className="w-4 h-4 text-slate-300" />
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <div className="bg-slate-50/50">
        <Pricing />
      </div>

      {/* Pricing CTA */}
      <section className="pb-12 px-4 bg-slate-50/50">
        <div className="container mx-auto text-center">
          <Button
            size="lg"
            className="bg-slate-900 hover:bg-slate-800 text-white text-base px-8 h-12"
            onClick={() => navigate("/plans")}
          >
            View all plans <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Testimonials */}
      <div className="bg-white">
        <Testimonials />
      </div>

      {/* CTA */}
      <section className="py-24 px-4 bg-white">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-2xl p-12 text-center space-y-6 bg-slate-900 text-white relative overflow-hidden"
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/20 blur-3xl rounded-full" />
            <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tight relative">
              Ready to find your perfect hustle?
            </h2>
            <p className="text-slate-300 relative">
              Join thousands discovering their next income stream with AI.
            </p>
            <Button
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-base px-8 h-12 relative"
              onClick={() => navigate("/signup")}
            >
              Start free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* B2B / API CTA — for businesses & developers */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-slate-50 border-t border-slate-100">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden p-8 md:p-14 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#312E81] text-white"
          >
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-fuchsia-500/30 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-500/20 blur-3xl rounded-full pointer-events-none" />

            <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-10 items-center">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs">
                  <Building2 className="w-3.5 h-3.5" /> Are you a business?
                </div>
                <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight leading-[1.05]">
                  Plug HustleAI into <span className="bg-gradient-to-r from-fuchsia-300 to-amber-200 bg-clip-text text-transparent">your product.</span>
                </h2>
                <p className="text-slate-300 text-base md:text-lg max-w-xl">
                  Embed our 20+ AI & Work tools — Invoices, Time tracker, Clients CRM, Resume Optimizer, Proposal Drafter, Gig Pricer, Red-Flag Scanner & more — into your platform via clean REST APIs. Volume pricing, enterprise SLA, dedicated support.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    size="lg"
                    className="bg-white text-slate-900 hover:bg-slate-100 h-12 px-6 font-semibold"
                    onClick={() => navigate("/products")}
                  >
                    Browse B2B APIs <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 px-6 border-white text-white bg-white/10 hover:bg-white/20 hover:text-white font-semibold"
                    onClick={() => navigate("/contact")}
                  >
                    Talk to sales
                  </Button>
                </div>
              </div>

              <div className="relative rounded-2xl bg-black/40 backdrop-blur border border-white/10 p-5 font-mono text-[12px] leading-relaxed shadow-2xl">
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                  <Code2 className="w-3.5 h-3.5 ml-auto text-slate-400" />
                </div>
                <pre className="text-slate-300 whitespace-pre-wrap">
<span className="text-fuchsia-300">POST</span> https://api.hustlaiapp.in/v1/<span className="text-amber-200">resume-optimize</span>

{`{`}
  <span className="text-cyan-300">"resume"</span>: <span className="text-emerald-300">"..."</span>,
  <span className="text-cyan-300">"target_role"</span>: <span className="text-emerald-300">"Frontend Eng"</span>
{`}`}
                </pre>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="bg-white">
        <Footer />
      </div>
    </div>
  );
}
