import { Navbar } from "@/components/Navbar";
import { motion } from "framer-motion";
import { Zap, Target, Users, Globe } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl space-y-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <h1 className="text-4xl md:text-6xl font-display font-bold">
              About <span className="text-gradient">HustleAI</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              We're on a mission to democratize freelancing by making it easy for anyone to discover, start, and scale their side hustle — powered by AI.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { icon: Zap, title: "Our Mission", desc: "To empower millions of aspiring freelancers with AI-driven insights, eliminating the guesswork from finding the perfect side hustle." },
              { icon: Target, title: "Our Vision", desc: "A world where anyone, regardless of background or budget, can build a thriving freelance career with the right guidance." },
              { icon: Users, title: "Our Community", desc: "Over 10,000 active hustlers sharing insights, supporting each other, and growing together across our Pro and Elite communities." },
              { icon: Globe, title: "Global Reach", desc: "Serving freelancers across 50+ countries with opportunities tailored to local markets and global remote work trends." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="glass rounded-xl p-6 space-y-3"
              >
                <item.icon className="w-8 h-8 text-primary" />
                <h3 className="font-display font-bold text-lg">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
