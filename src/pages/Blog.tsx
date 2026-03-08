import { Navbar } from "@/components/Navbar";
import { motion } from "framer-motion";
import { Calendar, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const posts = [
  {
    title: "10 Zero-Investment Side Hustles for 2026",
    excerpt: "Start earning today without spending a single rupee. These proven ideas have helped thousands of students and professionals build extra income streams.",
    date: "Mar 5, 2026",
    readTime: "5 min",
    category: "Getting Started",
  },
  {
    title: "How to Price Your Freelance Services",
    excerpt: "Stop undercharging! Learn the psychology behind pricing and discover frameworks used by top-earning freelancers worldwide.",
    date: "Mar 3, 2026",
    readTime: "7 min",
    category: "Strategy",
  },
  {
    title: "AI Tools Every Freelancer Needs in 2026",
    excerpt: "From proposal writing to project management, these AI tools will 10x your productivity and help you deliver better work.",
    date: "Feb 28, 2026",
    readTime: "6 min",
    category: "Tools",
  },
  {
    title: "Building Your Personal Brand on LinkedIn",
    excerpt: "A step-by-step guide to growing your LinkedIn presence and attracting high-paying clients through content creation.",
    date: "Feb 25, 2026",
    readTime: "8 min",
    category: "Marketing",
  },
  {
    title: "From ₹5K to ₹5L/Month: A Freelancer's Journey",
    excerpt: "Rohan Gupta shares his incredible journey from college student to six-figure freelancer using HustleAI's platform.",
    date: "Feb 20, 2026",
    readTime: "10 min",
    category: "Success Story",
  },
  {
    title: "Top 5 Mistakes New Freelancers Make",
    excerpt: "Avoid these common pitfalls that cause 80% of new freelancers to quit within their first 3 months.",
    date: "Feb 15, 2026",
    readTime: "4 min",
    category: "Tips",
  },
];

export default function Blog() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 mb-12"
          >
            <h1 className="text-4xl md:text-6xl font-display font-bold">
              The <span className="text-gradient">Hustle</span> Blog
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Tips, strategies, and stories to fuel your freelancing journey.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {posts.map((post, i) => (
              <motion.article
                key={post.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                viewport={{ once: true }}
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
