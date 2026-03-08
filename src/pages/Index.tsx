import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { SearchBar } from "@/components/SearchBar";
import { ArrowRight, Zap, Brain, Target, TrendingUp, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Brain, title: "AI-Powered Search", desc: "Get personalized freelancing ideas tailored to your skills, budget, and goals." },
  { icon: Target, title: "Zero Investment Filter", desc: "Find opportunities that require no upfront cost — perfect for students and beginners." },
  { icon: TrendingUp, title: "Real-Time Trends", desc: "Discover trending gigs and side hustles powered by live AI analysis." },
  { icon: Shield, title: "Vetted Ideas", desc: "Every suggestion is validated with earning potential and difficulty ratings." },
  { icon: Globe, title: "Global Opportunities", desc: "Find remote freelancing roles from anywhere in the world." },
  { icon: Zap, title: "Instant Results", desc: "Get actionable ideas in seconds, not hours of research." },
];

const stats = [
  { value: "500+", label: "Freelancing Categories" },
  { value: "AI", label: "Powered Suggestions" },
  { value: "0", label: "Investment Required" },
  { value: "24/7", label: "Live Search" },
];

export default function Index() {
  const navigate = useNavigate();

  const handleSearch = (query: string) => {
    navigate(`/explore?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            <span className="font-display font-bold text-xl">HustleAI</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/explore")}>Explore</Button>
            <Button className="bg-gradient-primary text-primary-foreground" onClick={() => navigate("/explore")}>
              Get Started <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm mb-4">
              <Sparkle /> AI-Powered Freelance Discovery
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight">
              Find Your Next{" "}
              <span className="text-gradient">Side Hustle</span>
              <br />
              in Seconds
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Stop scrolling job boards. Tell us your skills, budget, and goals — our AI finds the perfect freelancing opportunities for you in real time.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="max-w-3xl mx-auto"
          >
            <SearchBar onSearch={handleSearch} size="lg" />
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-border/50">
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
                <div className="text-3xl md:text-4xl font-display font-bold text-gradient">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16 space-y-4"
          >
            <h2 className="text-3xl md:text-5xl font-display font-bold">
              Why <span className="text-gradient">HustleAI</span>?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Unlike other platforms, we use AI to understand your exact needs and deliver personalized, actionable results.
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
                className="glass rounded-xl p-6 hover:shadow-glow hover:border-primary/30 transition-all duration-300 group"
              >
                <f.icon className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-12 text-center space-y-6 border-primary/20"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold">
              Ready to Find Your <span className="text-gradient">Perfect Hustle</span>?
            </h2>
            <p className="text-muted-foreground">
              Join thousands discovering their next income stream with AI-powered search.
            </p>
            <Button
              size="lg"
              className="bg-gradient-primary text-primary-foreground text-lg px-8 h-14"
              onClick={() => navigate("/explore")}
            >
              Start Exploring <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="container mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-display font-semibold">HustleAI</span>
          </div>
          <p>© 2026 HustleAI. AI-powered freelance discovery.</p>
        </div>
      </footer>
    </div>
  );
}

function Sparkle() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-primary">
      <path d="M8 0L9.79 6.21L16 8L9.79 9.79L8 16L6.21 9.79L0 8L6.21 6.21L8 0Z" fill="currentColor" />
    </svg>
  );
}
