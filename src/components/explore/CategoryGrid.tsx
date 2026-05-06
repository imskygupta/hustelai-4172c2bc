import { motion } from "framer-motion";
import { Briefcase, Bot, Cpu, PenTool, Package, GraduationCap, Eye, User, Boxes, Headphones } from "lucide-react";

export type CategoryDef = {
  key: string;
  label: string;
  desc: string;
  query: string;
  Icon: React.ComponentType<{ className?: string }>;
  gradient: string;
};

export const CATEGORIES: CategoryDef[] = [
  { key: "freelancing", label: "Freelancing", desc: "Service-based independent work", query: "freelance services for clients", Icon: Briefcase, gradient: "from-emerald-500/20 via-emerald-400/10 to-cyan-500/10" },
  { key: "ai-services", label: "AI Services", desc: "Productize AI workflows for clients", query: "AI services and AI-powered consulting", Icon: Bot, gradient: "from-violet-500/25 via-purple-500/10 to-fuchsia-500/10" },
  { key: "automation", label: "Automation Agencies", desc: "n8n, Zapier, Make pipelines", query: "automation agency workflows for businesses", Icon: Cpu, gradient: "from-cyan-500/20 via-sky-500/10 to-blue-500/10" },
  { key: "content", label: "Content Systems", desc: "Repeatable content engines", query: "content production systems and engines", Icon: PenTool, gradient: "from-amber-500/20 via-orange-500/10 to-rose-500/10" },
  { key: "products", label: "Digital Products", desc: "Templates, notion kits, ebooks", query: "digital products to sell online", Icon: Package, gradient: "from-pink-500/20 via-rose-500/10 to-red-500/10" },
  { key: "students", label: "Student Hustles", desc: "Low-capital, fast-start ideas", query: "side hustles for students with low investment", Icon: GraduationCap, gradient: "from-lime-500/20 via-emerald-500/10 to-teal-500/10" },
  { key: "faceless", label: "Faceless Brands", desc: "Anonymous creator systems", query: "faceless content brands and channels", Icon: Eye, gradient: "from-slate-500/20 via-zinc-500/10 to-stone-500/10" },
  { key: "personal-brand", label: "Personal Branding", desc: "Authority, audience, leverage", query: "personal branding business systems", Icon: User, gradient: "from-indigo-500/20 via-violet-500/10 to-purple-500/10" },
  { key: "saas", label: "Micro SaaS", desc: "Tiny software businesses", query: "micro SaaS ideas for indie founders", Icon: Boxes, gradient: "from-blue-500/20 via-indigo-500/10 to-violet-500/10" },
  { key: "client-services", label: "Client Services", desc: "Done-for-you operations", query: "done-for-you client services agencies", Icon: Headphones, gradient: "from-teal-500/20 via-cyan-500/10 to-emerald-500/10" },
];

export function CategoryGrid({ onPick }: { onPick: (c: CategoryDef) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {CATEGORIES.map((c, i) => (
        <motion.button
          key={c.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          onClick={() => onPick(c)}
          className="group text-left"
        >
          <div className={`relative h-full rounded-xl border border-border/60 bg-gradient-to-br ${c.gradient} p-4 hover:border-primary/40 hover:shadow-glow transition-all duration-300 hover:-translate-y-0.5 overflow-hidden`}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.15),transparent_60%)]" />
            <div className="relative">
              <div className="w-9 h-9 rounded-lg bg-background/70 border border-border/60 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <c.Icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-semibold leading-tight">{c.label}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{c.desc}</p>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}