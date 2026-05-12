import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  heading: string;
  sub?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function CTASection({
  heading,
  sub,
  primaryHref = "/signup",
  primaryLabel = "Start free workspace",
  secondaryHref = "/plans",
  secondaryLabel = "See pricing",
}: Props) {
  return (
    <section className="px-4 mt-24">
      <div className="container mx-auto max-w-4xl rounded-3xl bg-slate-900 text-white p-10 md:p-14 text-center relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/20 blur-3xl rounded-full" />
        <h2 className="text-2xl md:text-4xl font-display font-semibold tracking-tight relative leading-tight">{heading}</h2>
        {sub && <p className="text-slate-300 mt-4 max-w-2xl mx-auto relative">{sub}</p>}
        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3 relative">
          <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Link to={primaryHref}>{primaryLabel} <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white">
            <Link to={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}