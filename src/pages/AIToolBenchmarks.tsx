import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Search, ThumbsUp, ThumbsDown, ExternalLink, Filter,
  Zap, DollarSign, Code, Palette, Megaphone, BarChart3, Bot,
  Sparkles, ChevronDown, ChevronUp
} from "lucide-react";

interface Tool {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  pricing: string;
  rating: number;
  reviewCount: number;
  pros: string[];
  cons: string[];
  bestFor: string;
  url: string;
  trending: boolean;
  features: { name: string; score: number }[];
}

const tools: Tool[] = [
  {
    id: "cursor", name: "Cursor", category: "Coding", icon: "⚡",
    description: "AI-first code editor with inline completions, chat, and codebase-aware suggestions. Built on VS Code.",
    pricing: "Free / Pro $20/mo", rating: 4.8, reviewCount: 1240,
    pros: ["Best-in-class autocomplete", "Understands full codebase", "Tab completion feels magical"],
    cons: ["Heavier than VS Code", "Pro plan needed for best models", "Occasional hallucinations"],
    bestFor: "Full-stack developers who want AI deeply integrated into their workflow",
    url: "https://cursor.sh", trending: true,
    features: [{ name: "Code Quality", score: 95 }, { name: "Speed", score: 88 }, { name: "Value", score: 82 }, { name: "Ease of Use", score: 90 }],
  },
  {
    id: "copilot", name: "GitHub Copilot", category: "Coding", icon: "🤖",
    description: "GitHub's AI pair programmer. Works inside VS Code, JetBrains, and Neovim with inline suggestions.",
    pricing: "$10/mo Individual", rating: 4.5, reviewCount: 3800,
    pros: ["Deep GitHub integration", "Works in many IDEs", "Great for boilerplate"],
    cons: ["Less context-aware than Cursor", "No built-in chat (needs extension)", "Occasional license issues"],
    bestFor: "Developers already in the GitHub ecosystem who want a lightweight AI assistant",
    url: "https://github.com/features/copilot", trending: false,
    features: [{ name: "Code Quality", score: 88 }, { name: "Speed", score: 92 }, { name: "Value", score: 90 }, { name: "Ease of Use", score: 95 }],
  },
  {
    id: "v0", name: "v0 by Vercel", category: "Design-to-Code", icon: "🎨",
    description: "AI tool that generates React + Tailwind UI components from text prompts and images.",
    pricing: "Free / Pro $20/mo", rating: 4.6, reviewCount: 890,
    pros: ["Stunning UI output", "Copy-paste ready code", "Great for prototyping"],
    cons: ["React/Next.js only", "Limited backend logic", "Can be repetitive in design"],
    bestFor: "Frontend devs and designers who need beautiful UI components fast",
    url: "https://v0.dev", trending: true,
    features: [{ name: "Code Quality", score: 85 }, { name: "Speed", score: 96 }, { name: "Value", score: 88 }, { name: "Ease of Use", score: 94 }],
  },
  {
    id: "chatgpt", name: "ChatGPT Plus", category: "General AI", icon: "💬",
    description: "OpenAI's flagship conversational AI. Handles coding, writing, analysis, and creative tasks.",
    pricing: "Free / Plus $20/mo", rating: 4.7, reviewCount: 12400,
    pros: ["Most versatile AI", "GPT-5 access on Plus", "Great for brainstorming"],
    cons: ["Not specialized for coding", "Can be verbose", "Rate limits on free tier"],
    bestFor: "Freelancers who need an all-purpose AI for writing, research, and coding",
    url: "https://chat.openai.com", trending: false,
    features: [{ name: "Code Quality", score: 82 }, { name: "Speed", score: 85 }, { name: "Value", score: 78 }, { name: "Ease of Use", score: 98 }],
  },
  {
    id: "midjourney", name: "Midjourney", category: "Image Generation", icon: "🖼️",
    description: "Premium AI image generation tool known for photorealistic and artistic outputs via Discord.",
    pricing: "$10-60/mo", rating: 4.9, reviewCount: 5600,
    pros: ["Best image quality", "Massive style range", "Active community"],
    cons: ["Discord-only interface", "No API for automation", "Learning curve for prompts"],
    bestFor: "Designers and content creators who need high-quality AI-generated visuals",
    url: "https://midjourney.com", trending: true,
    features: [{ name: "Output Quality", score: 98 }, { name: "Speed", score: 80 }, { name: "Value", score: 75 }, { name: "Ease of Use", score: 70 }],
  },
  {
    id: "canva", name: "Canva AI (Magic Studio)", category: "Design", icon: "✨",
    description: "Canva's AI suite for auto-generating presentations, social posts, videos, and brand kits.",
    pricing: "Free / Pro ₹500/mo", rating: 4.4, reviewCount: 7800,
    pros: ["All-in-one design tool", "Great templates", "Team collaboration"],
    cons: ["AI features still maturing", "Export quality limitations", "Template lock-in"],
    bestFor: "Non-designers and social media managers who need quick professional graphics",
    url: "https://canva.com", trending: false,
    features: [{ name: "Output Quality", score: 82 }, { name: "Speed", score: 95 }, { name: "Value", score: 92 }, { name: "Ease of Use", score: 98 }],
  },
  {
    id: "jasper", name: "Jasper AI", category: "Writing", icon: "✍️",
    description: "AI content platform for marketing teams. Generates blog posts, ads, social copy, and emails.",
    pricing: "$49/mo Creator", rating: 4.3, reviewCount: 2100,
    pros: ["Marketing-focused templates", "Brand voice training", "SEO integration"],
    cons: ["Expensive for solo users", "Output needs editing", "Better alternatives emerging"],
    bestFor: "Marketing freelancers and agencies who produce high-volume content",
    url: "https://jasper.ai", trending: false,
    features: [{ name: "Output Quality", score: 80 }, { name: "Speed", score: 90 }, { name: "Value", score: 65 }, { name: "Ease of Use", score: 88 }],
  },
  {
    id: "notion-ai", name: "Notion AI", category: "Productivity", icon: "📋",
    description: "AI writing and organization assistant built into Notion. Summarize, brainstorm, draft, and translate.",
    pricing: "$10/mo add-on", rating: 4.2, reviewCount: 3200,
    pros: ["Integrated into workspace", "Great for docs & notes", "Simple to use"],
    cons: ["Limited outside Notion", "Basic compared to ChatGPT", "Add-on cost"],
    bestFor: "Freelancers who already use Notion and want AI where they work",
    url: "https://notion.so/product/ai", trending: false,
    features: [{ name: "Output Quality", score: 75 }, { name: "Speed", score: 92 }, { name: "Value", score: 70 }, { name: "Ease of Use", score: 96 }],
  },
];

const categories = ["All", "Coding", "Design-to-Code", "General AI", "Image Generation", "Design", "Writing", "Productivity"];

export default function AIToolBenchmarks() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"rating" | "reviews" | "trending">("rating");
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [compareTools, setCompareTools] = useState<string[]>([]);

  const filtered = tools
    .filter(t => category === "All" || t.category === category)
    .filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "reviews") return b.reviewCount - a.reviewCount;
      return (b.trending ? 1 : 0) - (a.trending ? 1 : 0);
    });

  const comparedTools = tools.filter(t => compareTools.includes(t.id));

  const toggleCompare = (id: string) => {
    setCompareTools(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-28 pb-16 px-4">
          <div className="container mx-auto max-w-6xl space-y-8">
            {/* Header */}
            <ScrollReveal>
              <div className="text-center space-y-3">
                <Badge variant="outline" className="border-primary/30 text-primary">
                  <Zap className="w-3.5 h-3.5 mr-1" /> AI Tool Reviews
                </Badge>
                <h1 className="text-4xl md:text-6xl font-display font-bold">
                  AI Tool <span className="text-gradient">Benchmarks</span>
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Compare the best AI tools for freelancers. Real benchmarks, honest reviews, and side-by-side comparisons.
                </p>
              </div>
            </ScrollReveal>

            {/* Search & Filters */}
            <div className="glass rounded-2xl p-4 space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search AI tools..." className="pl-10" />
                </div>
                <div className="flex gap-2">
                  {(["rating", "reviews", "trending"] as const).map(s => (
                    <Button key={s} size="sm" variant={sortBy === s ? "default" : "outline"}
                      onClick={() => setSortBy(s)} className={sortBy === s ? "bg-gradient-primary" : ""}>
                      {s === "rating" ? "Top Rated" : s === "reviews" ? "Most Reviewed" : "🔥 Trending"}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <Badge key={c} variant={category === c ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${category === c ? "bg-primary text-primary-foreground" : "hover:border-primary/50"}`}
                    onClick={() => setCategory(c)}>
                    {c}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Compare Bar */}
            <AnimatePresence>
              {compareTools.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="glass rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">Comparing {compareTools.length}/3 tools</span>
                    <div className="flex gap-1">
                      {comparedTools.map(t => (
                        <Badge key={t.id} variant="secondary" className="text-xs">{t.icon} {t.name}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setCompareTools([])}>Clear</Button>
                    <Button size="sm" className="bg-gradient-primary"
                      onClick={() => document.getElementById("compare-section")?.scrollIntoView({ behavior: "smooth" })}>
                      Compare →
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tool Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              {filtered.map((tool, i) => (
                <motion.div key={tool.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass rounded-xl p-5 space-y-3 hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{tool.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-bold">{tool.name}</h3>
                          {tool.trending && <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]" variant="outline">🔥 Hot</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{tool.category} · {tool.pricing}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-primary fill-primary" />
                        <span className="font-display font-bold">{tool.rating}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{tool.reviewCount.toLocaleString()} reviews</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">{tool.description}</p>

                  {/* Feature Bars */}
                  <div className="space-y-2">
                    {tool.features.map(f => (
                      <div key={f.name} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-20 shrink-0">{f.name}</span>
                        <Progress value={f.score} className="h-1.5 flex-1" />
                        <span className="text-[10px] font-mono text-primary w-8 text-right">{f.score}</span>
                      </div>
                    ))}
                  </div>

                  {/* Expanded */}
                  <AnimatePresence>
                    {expandedTool === tool.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden">
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                          <div>
                            <p className="text-xs font-semibold text-green-400 mb-1 flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> Pros</p>
                            {tool.pros.map(p => <p key={p} className="text-xs text-muted-foreground">✓ {p}</p>)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-red-400 mb-1 flex items-center gap-1"><ThumbsDown className="w-3 h-3" /> Cons</p>
                            {tool.cons.map(c => <p key={c} className="text-xs text-muted-foreground">✗ {c}</p>)}
                          </div>
                        </div>
                        <p className="text-xs"><span className="text-primary font-semibold">Best for:</span> <span className="text-muted-foreground">{tool.bestFor}</span></p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" variant="ghost" className="text-xs"
                      onClick={() => setExpandedTool(expandedTool === tool.id ? null : tool.id)}>
                      {expandedTool === tool.id ? <><ChevronUp className="w-3 h-3 mr-1" /> Less</> : <><ChevronDown className="w-3 h-3 mr-1" /> Details</>}
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={() => toggleCompare(tool.id)}>
                      {compareTools.includes(tool.id) ? "✓ Added" : "Compare"}
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs ml-auto"
                      onClick={() => window.open(tool.url, "_blank")}>
                      <ExternalLink className="w-3 h-3 mr-1" /> Visit
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Compare Section */}
            {comparedTools.length >= 2 && (
              <div id="compare-section" className="space-y-4">
                <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-primary" /> Side-by-Side Comparison
                </h2>
                <div className="glass rounded-2xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left p-4 text-muted-foreground font-normal">Feature</th>
                        {comparedTools.map(t => (
                          <th key={t.id} className="p-4 text-center">
                            <span className="text-xl">{t.icon}</span>
                            <p className="font-display font-bold mt-1">{t.name}</p>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/30">
                        <td className="p-4 text-muted-foreground">Rating</td>
                        {comparedTools.map(t => (
                          <td key={t.id} className="p-4 text-center">
                            <span className="flex items-center justify-center gap-1">
                              <Star className="w-4 h-4 text-primary fill-primary" /> {t.rating}
                            </span>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-border/30">
                        <td className="p-4 text-muted-foreground">Pricing</td>
                        {comparedTools.map(t => <td key={t.id} className="p-4 text-center text-xs">{t.pricing}</td>)}
                      </tr>
                      <tr className="border-b border-border/30">
                        <td className="p-4 text-muted-foreground">Best For</td>
                        {comparedTools.map(t => <td key={t.id} className="p-4 text-center text-xs text-muted-foreground">{t.bestFor}</td>)}
                      </tr>
                      {comparedTools[0]?.features.map((f, fi) => (
                        <tr key={f.name} className="border-b border-border/30">
                          <td className="p-4 text-muted-foreground">{f.name}</td>
                          {comparedTools.map(t => {
                            const feat = t.features[fi];
                            const isHighest = feat && Math.max(...comparedTools.map(ct => ct.features[fi]?.score || 0)) === feat.score;
                            return (
                              <td key={t.id} className="p-4 text-center">
                                <span className={`font-mono font-bold ${isHighest ? "text-primary" : "text-muted-foreground"}`}>
                                  {feat?.score || "N/A"}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    </PageTransition>
  );
}
