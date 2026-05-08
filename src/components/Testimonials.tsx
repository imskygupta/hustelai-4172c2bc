import { motion } from "framer-motion";
import { Star, TrendingUp } from "lucide-react";

const testimonials = [
  {
    name: "Aarav Mehta",
    role: "Founder, Lumen Studio",
    text: "Replaced Notion, HoneyBook and three spreadsheets with one workspace. We onboarded 12 retainer clients last quarter without missing a single deadline.",
    rating: 5,
    avatar: "AM",
    metric: "12 retainers managed",
  },
  {
    name: "Priya Iyer",
    role: "Brand Designer",
    text: "The client portal alone justified the Pro plan. Clients stopped emailing PDFs and started leaving feedback right inside the project.",
    rating: 5,
    avatar: "PI",
    metric: "0 lost email threads",
  },
  {
    name: "Rohan Kapoor",
    role: "Lead, Northwind Design Co.",
    text: "Proposal → contract → invoice in one flow. Our cash collection cycle dropped from 21 days to 9 — that alone changed how we plan the month.",
    rating: 5,
    avatar: "RK",
    metric: "9-day cash cycle",
  },
  {
    name: "Ananya Sen",
    role: "Independent Dev Consultant",
    text: "AI assist drafts my scope docs and follow-ups. I edit instead of writing from scratch — saves me roughly six hours a week of admin.",
    rating: 5,
    avatar: "AS",
    metric: "~6 hrs/week saved",
  },
  {
    name: "Vikram Shetty",
    role: "Ops, Halo Content Agency",
    text: "Pipelines plus the retainers view finally gave us forecasting we never had in Sheets. We can see next month's revenue before it lands.",
    rating: 5,
    avatar: "VS",
    metric: "30-day revenue forecast",
  },
  {
    name: "Neha Krishnan",
    role: "Freelance Illustrator",
    text: "Took me about a week to migrate from Trello and Razorpay invoices, but having CRM, files and billing in one place was worth the switch.",
    rating: 4,
    avatar: "NK",
    metric: "1 tool, not 4",
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
            Built for client work
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Freelancers and small agencies use HustleAI Workspace OS to run clients, projects and billing in one place.
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
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, j) => (
                    <Star
                      key={j}
                      className={`w-4 h-4 ${j < t.rating ? "text-emerald-500 fill-emerald-500" : "text-slate-300"}`}
                    />
                  ))}
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                  <TrendingUp className="w-3 h-3" />
                  {t.metric}
                </span>
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
