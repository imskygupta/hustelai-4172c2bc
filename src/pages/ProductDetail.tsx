import { useEffect, useRef } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import gsap from "gsap";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Check, Code2 } from "lucide-react";
import { getProduct, PRODUCTS } from "@/data/products";

const SHARP = "from-[#FF3CAC] via-[#784BA0] to-[#2B86C5]";

export default function ProductDetail() {
  const { slug } = useParams();
  const product = slug ? getProduct(slug) : null;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!product) return;
    document.title = `${product.name} — HustleAI Products`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", product.tagline);

    const ctx = gsap.context(() => {
      gsap.fromTo(".pd-line", { y: 32, opacity: 0, filter: "blur(6px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.8, stagger: 0.07, ease: "power3.out" });
    }, ref);
    return () => ctx.revert();
  }, [product]);

  if (!product) return <Navigate to="/products" replace />;
  const Icon = product.icon;
  const related = PRODUCTS.filter((p) => p.slug !== product.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <main ref={ref} className="relative pt-28 pb-20 px-4">
        <div className={`pointer-events-none absolute top-0 inset-x-0 h-[420px] bg-gradient-to-br ${SHARP} opacity-20 blur-3xl`} />

        <div className="relative container mx-auto max-w-5xl">
          <Link to="/products" className="pd-line inline-flex items-center text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-1" /> All products
          </Link>

          <div className="pd-line mt-6 flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${SHARP} grid place-items-center`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div>
              <Badge variant="outline" className="border-white/20 text-slate-300 text-[10px] mb-1">{product.category}</Badge>
              <h1 className="text-3xl md:text-5xl font-display font-bold">{product.name}</h1>
            </div>
          </div>

          <p className="pd-line mt-5 text-lg md:text-xl text-slate-300 max-w-3xl">{product.hero}</p>

          <div className="pd-line mt-7 flex flex-wrap gap-3">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
              Request API access <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <Link to={product.consumerHref}>Try it in-app</Link>
            </Button>
          </div>

          {/* Features + API preview */}
          <div className="pd-line mt-14 grid lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-lg font-semibold mb-4">What you get</h2>
              <ul className="space-y-3">
                {product.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6 font-mono text-xs">
              <div className="flex items-center gap-2 text-slate-400 mb-3">
                <Code2 className="w-3.5 h-3.5" /> Sample request
              </div>
              <pre className="text-emerald-300 whitespace-pre-wrap leading-relaxed">{product.apiPreview}</pre>
            </div>
          </div>

          {/* Use cases */}
          <div className="pd-line mt-14">
            <h2 className="text-2xl font-display font-bold mb-5">Built for teams like yours</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {product.useCases.map((u) => (
                <div key={u.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <h3 className="font-semibold">{u.title}</h3>
                  <p className="text-sm text-slate-400 mt-1.5">{u.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="pd-line mt-14">
            <h2 className="text-2xl font-display font-bold mb-5">Pricing</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {product.pricing.map((p) => (
                <div key={p.plan} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <div className="text-sm text-slate-400">{p.plan}</div>
                  <div className="text-3xl font-bold mt-1">{p.price}</div>
                  <div className="text-xs text-slate-400 mt-1">{p.calls}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Related */}
          <div className="pd-line mt-16">
            <h2 className="text-2xl font-display font-bold mb-5">Pair it with</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {related.map((p) => {
                const I = p.icon;
                return (
                  <Link key={p.slug} to={`/products/${p.slug}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-white/20 transition-colors">
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${SHARP} grid place-items-center mb-3`}>
                      <I className="w-4 h-4 text-white" />
                    </div>
                    <div className="font-semibold text-sm">{p.name}</div>
                    <div className="text-xs text-slate-400 mt-1 line-clamp-2">{p.tagline}</div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Final CTA */}
          <div className={`pd-line mt-16 rounded-3xl p-10 bg-gradient-to-br ${SHARP} text-center`}>
            <h2 className="text-2xl md:text-3xl font-display font-bold">Ship {product.name.replace(" API", "")} in your product this week</h2>
            <p className="mt-3 text-white/90">Closed beta · 50k free calls · Slack with our team</p>
            <Button size="lg" className="mt-5 bg-white text-slate-900 hover:bg-slate-100">
              Request API access <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}