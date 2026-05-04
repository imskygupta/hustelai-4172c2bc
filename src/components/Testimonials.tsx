import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Aarav Sharma",
    role: "Freelance Developer",
    text: "HustleAI helped me find my first ₹50K/month freelancing gig within two weeks. The AI recommendations are insanely accurate!",
    rating: 5,
    avatar: "AS",
  },
  {
    name: "Priya Patel",
    role: "Content Creator",
    text: "The Elite plan's chatbot is like having a personal business mentor. It guided me through pricing my services perfectly.",
    rating: 5,
    avatar: "PP",
  },
  {
    name: "Rohan Gupta",
    role: "UI/UX Designer",
    text: "Zero investment side hustles? Yes please! Started earning through HustleAI suggestions without spending a single rupee.",
    rating: 5,
    avatar: "RG",
  },
  {
    name: "Ananya Singh",
    role: "Digital Marketer",
    text: "The Pro plan's personalized monitoring caught a trending niche before anyone else. Made ₹2L in my first month!",
    rating: 5,
    avatar: "AS",
  },
  {
    name: "Vikram Reddy",
    role: "Full Stack Developer",
    text: "Live webinars from Elite plan taught me how to scale from ₹30K to ₹3L/month. Absolute game changer.",
    rating: 5,
    avatar: "VR",
  },
  {
    name: "Neha Krishnan",
    role: "Graphic Designer",
    text: "The free tools and software licenses in the Elite plan saved me over ₹15K/month. The value is unreal!",
    rating: 4,
    avatar: "NK",
  },
];

export function Testimonials() {
  return (
    <section className="py-24 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16 space-y-4"
        >
          <div className="text-xs uppercase tracking-[0.18em] text-emerald-600 font-medium">Testimonials</div>
          <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight text-slate-900">
            Loved by hustlers
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Thousands of freelancers trust HustleAI to power their income streams.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="rounded-xl p-6 space-y-4 bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100 hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex gap-1">
                {[...Array(5)].map((_, j) => (
                  <Star
                    key={j}
                    className={`w-4 h-4 ${j < t.rating ? "text-emerald-500 fill-emerald-500" : "text-slate-300"}`}
                  />
                ))}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-semibold text-sm">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-display font-semibold text-sm text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
