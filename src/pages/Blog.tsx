import { Navbar } from "@/components/Navbar";
import { motion } from "framer-motion";
import { Calendar, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

const staticPosts = [
  { title: "10 Zero-Investment Side Hustles for 2026", excerpt: "Start earning today without spending a single rupee.", date: "Mar 5, 2026", readTime: "5 min", category: "Getting Started", content: "" },
  { title: "How to Price Your Freelance Services", excerpt: "Stop undercharging! Learn pricing frameworks.", date: "Mar 3, 2026", readTime: "7 min", category: "Strategy", content: "" },
  { title: "AI Tools Every Freelancer Needs in 2026", excerpt: "AI tools that will 10x your productivity.", date: "Feb 28, 2026", readTime: "6 min", category: "Tools", content: "" },
  { title: "Building Your Personal Brand on LinkedIn", excerpt: "Grow your LinkedIn and attract high-paying clients.", date: "Feb 25, 2026", readTime: "8 min", category: "Marketing", content: "" },
];

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  category: string | null;
  author_name: string | null;
  created_at: string;
}

export default function Blog() {
  const [dbPosts, setDbPosts] = useState<BlogPost[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("blog_posts").select("*").eq("is_published", true).order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setDbPosts(data as BlogPost[]); });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 mb-12">
            <h1 className="text-4xl md:text-6xl font-display font-bold">
              The <span className="text-gradient">Hustle</span> Blog
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">Tips, strategies, and stories to fuel your freelancing journey.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* DB posts first */}
            {dbPosts.map((post, i) => (
              <motion.article key={post.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }} viewport={{ once: true }}
                className="glass rounded-xl p-6 space-y-4 hover:border-primary/30 hover:shadow-glow transition-all duration-300 group cursor-pointer"
                onClick={() => setExpanded(expanded === post.id ? null : post.id)}
              >
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{post.category || "General"}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(post.created_at).toLocaleDateString()}</span>
                  <span className="text-xs text-muted-foreground">by {post.author_name || "Admin"}</span>
                </div>
                <h2 className="font-display font-bold text-lg group-hover:text-gradient transition-colors">{post.title}</h2>
                {expanded === post.id ? (
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{post.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{post.excerpt || post.content.slice(0, 150) + "..."}</p>
                )}
                <Button variant="ghost" size="sm" className="text-primary p-0 h-auto">
                  {expanded === post.id ? "Collapse" : "Read More"} <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </motion.article>
            ))}

            {/* Static posts */}
            {staticPosts.map((post, i) => (
              <motion.article key={post.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: (dbPosts.length + i) * 0.08 }} viewport={{ once: true }}
                className="glass rounded-xl p-6 space-y-4 hover:border-primary/30 hover:shadow-glow transition-all duration-300 group cursor-pointer"
              >
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{post.category}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {post.date}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.readTime}</span>
                </div>
                <h2 className="font-display font-bold text-lg group-hover:text-gradient transition-colors">{post.title}</h2>
                <p className="text-sm text-muted-foreground">{post.excerpt}</p>
                <Button variant="ghost" size="sm" className="text-primary p-0 h-auto">
                  Read More <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
