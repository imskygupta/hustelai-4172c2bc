import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, LayoutDashboard, FileText, Calculator, Users, Send, Sparkles, Map, Briefcase } from "lucide-react";

type Action = {
  title: string;
  desc: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

const STACK: Action[] = [
  { title: "Create Workspace", desc: "Spin up a new project workspace", href: "/workspaces/new", Icon: LayoutDashboard, accent: "from-emerald-500/20 to-cyan-500/10" },
  { title: "Generate Roadmap", desc: "AI builds your phase-by-phase plan", href: "/workspaces/roadmap", Icon: Map, accent: "from-violet-500/20 to-indigo-500/10" },
  { title: "Draft Proposal", desc: "One-click client-ready proposal", href: "/proposal-draft", Icon: FileText, accent: "from-amber-500/20 to-orange-500/10" },
  { title: "Price the Gig", desc: "Calculate fair, profitable pricing", href: "/gig-price-calculator", Icon: Calculator, accent: "from-pink-500/20 to-rose-500/10" },
  { title: "Client Intake", desc: "Capture briefs through your portal", href: "/workspaces", Icon: Users, accent: "from-sky-500/20 to-blue-500/10" },
  { title: "Outreach Assets", desc: "Generate cold messages & DMs", href: "/ai-tools", Icon: Send, accent: "from-teal-500/20 to-emerald-500/10" },
  { title: "Hustle Blueprint", desc: "Deep operating manual for this idea", href: "/hustle-blueprint", Icon: Briefcase, accent: "from-fuchsia-500/20 to-purple-500/10" },
];

export function ActionStack({ context }: { context?: string }) {
  const navigate = useNavigate();
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-cyan-500/5 p-5 md:p-7 overflow-hidden"
    >
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      <div className="relative flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Suggested Action Stack
          </div>
          <h3 className="text-xl md:text-2xl font-display font-bold mt-1">
            From discovery → execution{context ? <span className="text-primary"> · {context}</span> : null}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Operationalize this opportunity inside Workspace OS. Each step plugs into the rest of your operating system.
          </p>
        </div>
        <Button onClick={() => navigate("/workspaces/new")} className="bg-gradient-primary text-primary-foreground">
          Launch in Workspace <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="relative grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {STACK.map((a, i) => (
          <motion.button
            key={a.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => navigate(a.href)}
            className="group text-left"
          >
            <Card className={`relative overflow-hidden p-4 border-border/60 hover:border-primary/40 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow bg-gradient-to-br ${a.accent}`}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-background/70 border border-border/60 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <a.Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{a.title}</p>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                </div>
              </div>
            </Card>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}