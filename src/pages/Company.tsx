import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Target, Eye, Heart, Globe, Users, Shield, Award, ArrowRight, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { SEO } from "@/components/SEO";

const values = [
  { icon: Target, title: "Mission-Driven", desc: "Every feature we build aims to democratize freelancing access for everyone, everywhere." },
  { icon: Eye, title: "Transparency", desc: "Open pricing, honest communication, no hidden fees — ever." },
  { icon: Heart, title: "Community First", desc: "Our users aren't customers — they're our community. We build with them, for them." },
  { icon: Shield, title: "Trust & Security", desc: "Your data, your hustle, your money — all protected with enterprise-grade security." },
];

const milestones = [
  { year: "2024", event: "HustleAI idea born", desc: "Founded with a mission to help 10M people find freelance income." },
  { year: "2025", event: "Public beta launch", desc: "AI-powered search engine for freelance opportunities goes live." },
  { year: "2026", event: "Community & Payments", desc: "Forums, KYC verification, Cashfree payments, and gamification launched." },
  { year: "2027", event: "Global expansion", desc: "Targeting 50+ countries with localized opportunities and multilingual AI." },
];

const team = [
  { name: "SkyTech Team", role: "Builders of HustleAI", desc: "A small, focused product team building AI tools that help people discover, start, and scale freelance income." },
];

export default function Company() {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
              <SEO title="Company — HustleAI Workspace OS" description="About the company behind HustleAI Workspace OS." path="/company" />
        <Navbar />

        {/* Hero */}
        <section className="pt-32 pb-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-primary/4 rounded-full blur-3xl" />
          </div>
          <div className="container mx-auto max-w-4xl text-center relative z-10 space-y-6">
            <ScrollReveal>
              <Badge variant="outline" className="border-primary/30 text-primary px-4 py-1.5">
                <Globe className="w-3.5 h-3.5 mr-1.5" /> Our Story
              </Badge>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight">
                Empowering <span className="text-gradient">Hustlers</span> Worldwide
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                HustleAI is on a mission to help 10 million people discover, start, and grow their freelance careers using AI-powered tools.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 px-4 border-t border-border/50">
          <div className="container mx-auto max-w-5xl">
            <ScrollReveal>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-12">
                Our <span className="text-gradient">Values</span>
              </h2>
            </ScrollReveal>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((v, i) => (
                <ScrollReveal key={v.title} delay={i * 0.08}>
                  <div className="glass rounded-xl p-6 text-center hover:shadow-glow hover:border-primary/30 transition-all duration-500 h-full group">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <v.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold mb-2">{v.title}</h3>
                    <p className="text-sm text-muted-foreground">{v.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-3xl">
            <ScrollReveal>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-12">
                Our <span className="text-gradient-accent">Journey</span>
              </h2>
            </ScrollReveal>
            <div className="relative">
              <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/40 via-accent/40 to-primary/40" />
              {milestones.map((m, i) => (
                <ScrollReveal key={m.year} delay={i * 0.1} direction={i % 2 === 0 ? "left" : "right"}>
                  <div className={`relative flex items-start gap-6 mb-12 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                    <div className={`flex-1 ${i % 2 === 0 ? "md:text-right" : "md:text-left"} pl-16 md:pl-0`}>
                      <div className="text-primary font-display font-bold text-2xl">{m.year}</div>
                      <h3 className="font-display font-semibold text-lg">{m.event}</h3>
                      <p className="text-sm text-muted-foreground">{m.desc}</p>
                    </div>
                    <div className="absolute left-3 md:left-1/2 md:-translate-x-1/2 w-7 h-7 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center z-10">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    </div>
                    <div className="flex-1 hidden md:block" />
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-20 px-4 border-t border-border/50">
          <div className="container mx-auto max-w-4xl">
            <ScrollReveal>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-12">
                Meet the <span className="text-gradient">Team</span>
              </h2>
            </ScrollReveal>
            <div className="flex justify-center">
              {team.map((member, i) => (
                <ScrollReveal key={member.name} delay={i * 0.1}>
                  <div className="glass rounded-2xl p-8 text-center max-w-sm hover:shadow-glow hover:border-primary/30 transition-all duration-500 group">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-4">
                      <Award className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <h3 className="font-display font-bold text-xl">{member.name}</h3>
                    <p className="text-primary text-sm font-medium mb-3">{member.role}</p>
                    <p className="text-sm text-muted-foreground">{member.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-3xl">
            <ScrollReveal direction="scale">
              <div className="glass rounded-2xl p-12 text-center space-y-6 border-primary/20">
                <Mail className="w-12 h-12 text-primary mx-auto" />
                <h2 className="text-3xl font-display font-bold">Get in Touch</h2>
                <p className="text-muted-foreground">
                  Have questions, partnerships, or media inquiries? Reach out anytime at{" "}
                  <a href="mailto:hustlaiapp@zohomail.in" className="text-primary hover:underline font-medium">hustlaiapp@zohomail.in</a>
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button size="lg" className="bg-gradient-primary text-primary-foreground" onClick={() => navigate("/contact")}>
                    Contact Us <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate("/career")}>
                    View Careers <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <Footer />
      </div>
    </PageTransition>
  );
}
