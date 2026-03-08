import { Navbar } from "@/components/Navbar";
import { Testimonials } from "@/components/Testimonials";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const moreReviews = [
  { name: "Deepak Verma", role: "Video Editor", text: "HustleAI's free tier helped me explore different niches before committing. Once I went Pro, my income doubled in just one month.", rating: 5, avatar: "DV" },
  { name: "Kavitha Nair", role: "SEO Specialist", text: "The AI search is pure magic. It found me a niche no one was talking about. Now I'm the go-to person for that service!", rating: 5, avatar: "KN" },
  { name: "Amit Joshi", role: "Copywriter", text: "The Elite webinars alone are worth the ₹800/month. I've learned more in 2 months than in 2 years of watching YouTube tutorials.", rating: 5, avatar: "AJ" },
  { name: "Sneha Iyer", role: "Social Media Manager", text: "Community groups here are incredibly supportive. I got my first ₹25K client through a referral in the Pro community!", rating: 4, avatar: "SI" },
  { name: "Rahul Menon", role: "App Developer", text: "The tools & licenses in Elite saved me over ₹20K/month in subscriptions. This plan pays for itself 20x over.", rating: 5, avatar: "RM" },
  { name: "Pooja Chauhan", role: "Podcast Producer", text: "From zero to ₹1.5L/month in 4 months. The personalized recommendations are what made the difference.", rating: 5, avatar: "PC" },
];

export default function Reviews() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 mb-12"
          >
            <h1 className="text-4xl md:text-6xl font-display font-bold">
              What <span className="text-gradient">Hustlers</span> Say
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Real stories from real freelancers who transformed their income with HustleAI.
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-primary fill-primary" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">4.9/5 from 2,400+ reviews</span>
            </div>
          </motion.div>

          <Testimonials />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {moreReviews.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="glass rounded-xl p-6 space-y-4"
              >
                <div className="flex gap-1">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className={`w-4 h-4 ${j < t.rating ? "text-primary fill-primary" : "text-muted-foreground"}`} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-display font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
