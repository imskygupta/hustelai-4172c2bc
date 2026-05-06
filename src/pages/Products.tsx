import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Zap, Shield, Globe2, Code2 } from "lucide-react";
import { PRODUCTS } from "@/data/products";

import { SEO } from "@/components/SEO";

gsap.registerPlugin(ScrollTrigger);

const SHARP = "from-[#FF3CAC] via-[#784BA0] to-[#2B86C5]"; // sharper saas gradient

export default function Products() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Products — AI APIs for B2B SaaS | HustleAI";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "12 production-grade AI APIs for B2B SaaS — blueprints, resumes, pricing, content, leads & more.");

    const ctx = gsap.context(() => {
      gsap.fromTo(".hero-line", { y: 40, opacity: 0, filter: "blur(8px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.9, stagger: 0.08, ease: "power3.out" });
      gsap.utils.toArray<HTMLElement>(".product-card").forEach((el, i) => {
        gsap.fromTo(el, { y: 30, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.6, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 90%" }, delay: (i % 3) * 0.05,
        });
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <SEO title="Products — HustleAI Workspace OS" description="Explore HustleAI Workspace OS modules: CRM, invoices, proposals, portals and AI assists." path="/products" />
      <Navbar />
      <main ref={heroRef} className="relative">
        {/* Hero */}
        <section className="relative pt-32 pb-24 px-4">
          <div className={`absolute inset-0 bg-gradient-to-br ${SHARP} opacity-30 blur-3xl`} />
          <div className="relative container mx-auto max-w-5xl text-center">
            <Badge className="hero-line mb-6 bg-white/10 border border-white/20 text-white">
              <Sparkles className="w-3 h-3 mr-1" /> 12 AI APIs · Built for B2B SaaS
            </Badge>
            <h1 className="hero-line text-5xl md:text-7xl font-display font-bold leading-tight">
              Drop-in AI for{" "}
              <span className={`bg-gradient-to-r ${SHARP} bg-clip-text text-transparent`}>
                modern SaaS
              </span>
            </h1>
            <p className="hero-line mt-6 text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
              The same AI that powers HustleAI — now available as production APIs.
              Ship career, content, sales and research features in days, not quarters.
            </p>
            <div className="hero-line mt-8 flex items-center justify-center gap-3 flex-wrap">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                Request API access <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white bg-white/10 hover:bg-white/20 hover:text-white font-semibold">
                Read docs
              </Button>
            </div>
            <div className="hero-line mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-xs">
              {[
                { icon: Zap, label: "p95 < 1.4s" },
                { icon: Shield, label: "SOC2 ready infra" },
                { icon: Globe2, label: "EU + US regions" },
                { icon: Code2, label: "OpenAPI + SDKs" },
              ].map(({ icon: I, label }) => (
                <div key={label} className="flex items-center gap-2 justify-center text-slate-400">
                  <I className="w-4 h-4" /> {label}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Products grid */}
        <section className="px-4 pb-24">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-10 flex items-end justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-display font-bold">Browse the catalog</h2>
                <p className="text-slate-400 mt-2">12 endpoints. One API key. Pay-as-you-go pricing.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {PRODUCTS.map((p) => {
                const Icon = p.icon;
                return (
                  <Link
                    key={p.slug}
                    to={`/products/${p.slug}`}
                    className="product-card group relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:bg-white/[0.06] hover:border-white/20 transition-all overflow-hidden"
                  >
                    <div className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${SHARP} opacity-0 group-hover:opacity-20 transition-opacity blur-xl`} />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${SHARP} grid place-items-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <Badge variant="outline" className="border-white/20 text-slate-300 text-[10px]">
                          {p.category}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold">{p.name}</h3>
                      <p className="text-sm text-slate-400 mt-1.5 line-clamp-2">{p.tagline}</p>
                      <div className="mt-5 flex items-center text-sm text-white/80 group-hover:text-white">
                        Explore <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-32">
          <div className="container mx-auto max-w-4xl">
            <div className={`rounded-3xl p-10 md:p-14 bg-gradient-to-br ${SHARP} text-center`}>
              <h2 className="text-3xl md:text-4xl font-display font-bold">Ready to ship AI features users love?</h2>
              <p className="mt-4 text-white/90">Join the closed beta — 50k free calls and direct Slack with our team.</p>
              <div className="mt-6 flex justify-center gap-3 flex-wrap">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                  Get API key <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white bg-white/10 hover:bg-white/20 hover:text-white font-semibold">
                  Talk to sales
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}