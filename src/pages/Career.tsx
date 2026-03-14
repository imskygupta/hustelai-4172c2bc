import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Rocket, Users, Heart, Code, Palette, Megaphone, BarChart3, ArrowRight, MapPin, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const openings = [
  { title: "Full-Stack Developer", dept: "Engineering", type: "Remote", icon: Code, desc: "Build and scale the HustleAI platform with React, Node.js, and cloud infrastructure." },
  { title: "UI/UX Designer", dept: "Design", type: "Remote", icon: Palette, desc: "Craft beautiful, intuitive interfaces that help users discover their perfect hustle." },
  { title: "Growth Marketing Lead", dept: "Marketing", type: "Hybrid", icon: Megaphone, desc: "Drive user acquisition and retention through data-driven marketing strategies." },
  { title: "Data Analyst", dept: "Analytics", type: "Remote", icon: BarChart3, desc: "Analyze user behavior and market trends to improve AI recommendations." },
];

const perks = [
  { icon: Rocket, title: "Fast Growth", desc: "Join a rocket-ship startup shaping the future of freelancing." },
  { icon: Heart, title: "Health & Wellness", desc: "Comprehensive health insurance and mental wellness programs." },
  { icon: Users, title: "Remote-First", desc: "Work from anywhere in the world with flexible hours." },
  { icon: Briefcase, title: "Equity Options", desc: "Own a piece of HustleAI with competitive stock options." },
];

export default function Career() {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Navbar />

        {/* Hero */}
        <section className="pt-32 pb-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
          </div>
          <div className="container mx-auto max-w-4xl text-center relative z-10 space-y-6">
            <ScrollReveal>
              <Badge variant="outline" className="border-primary/30 text-primary px-4 py-1.5">
                <Briefcase className="w-3.5 h-3.5 mr-1.5" /> We're Hiring
              </Badge>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight">
                Build the Future of <span className="text-gradient">Freelancing</span>
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join a passionate team empowering millions to discover their next income stream. We're remote-first, fast-moving, and full of ambition.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Perks */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-5xl">
            <ScrollReveal>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-12">
                Why Join <span className="text-gradient">HustleAI</span>?
              </h2>
            </ScrollReveal>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {perks.map((perk, i) => (
                <ScrollReveal key={perk.title} delay={i * 0.08}>
                  <div className="glass rounded-xl p-6 text-center hover:shadow-glow hover:border-primary/30 transition-all duration-500 h-full group">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <perk.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold mb-2">{perk.title}</h3>
                    <p className="text-sm text-muted-foreground">{perk.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Openings */}
        <section className="py-20 px-4 border-t border-border/50">
          <div className="container mx-auto max-w-4xl">
            <ScrollReveal>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4">Open Positions</h2>
              <p className="text-muted-foreground text-center mb-12">Find your role and help shape the freelance economy.</p>
            </ScrollReveal>
            <div className="space-y-4">
              {openings.map((job, i) => (
                <ScrollReveal key={job.title} delay={i * 0.06}>
                  <div className="glass rounded-xl p-6 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-glow hover:border-primary/30 transition-all duration-500 group cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <job.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-semibold text-lg">{job.title}</h3>
                      <p className="text-sm text-muted-foreground">{job.desc}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {job.dept}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.type}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Full-time</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                      onClick={() => window.location.href = "mailto:contact@hustlaiapp.in?subject=Application: " + job.title}>
                      Apply <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
...
                <p className="text-muted-foreground">We're always looking for talented people. Send us your resume at <a href="mailto:contact@hustlaiapp.in" className="text-primary hover:underline">contact@hustlaiapp.in</a></p>
                <Button size="lg" className="bg-gradient-primary text-primary-foreground"
                  onClick={() => window.location.href = "mailto:contact@hustlaiapp.in"}>
                  Get in Touch <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <Footer />
      </div>
    </PageTransition>
  );
}
