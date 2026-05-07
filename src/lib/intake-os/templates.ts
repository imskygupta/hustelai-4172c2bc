import type { IntakeField } from "./api";

export type IntakeTemplate = {
  id: string;
  name: string;
  icon: string;
  description: string;
  fields: IntakeField[];
};

export const INTAKE_TEMPLATES: IntakeTemplate[] = [
  {
    id: "website",
    name: "Website project",
    icon: "🌐",
    description: "Landing page, marketing site, or full website build",
    fields: [
      { key: "site_type", label: "Site type", type: "select", required: true, options: ["Landing page", "Marketing site (5+ pages)", "Web app", "E-commerce", "Portfolio"] },
      { key: "pages_count", label: "Approx. number of pages", type: "select", options: ["1", "2-5", "6-10", "10+"] },
      { key: "tech_pref", label: "Tech preference", type: "select", options: ["No preference", "WordPress", "Webflow", "Shopify", "Custom React/Next.js"] },
      { key: "design_status", label: "Design status", type: "select", required: true, options: ["I have designs", "Need design too", "Will use template"] },
      { key: "budget", label: "Budget range", type: "select", required: true, options: ["< ₹25k", "₹25k - ₹1L", "₹1L - ₹5L", "₹5L+"] },
      { key: "timeline", label: "Timeline", type: "select", required: true, options: ["ASAP", "2 weeks", "1 month", "Flexible"] },
      { key: "goals", label: "Primary goals", type: "textarea", required: true, placeholder: "What should this site achieve?" },
      { key: "references", label: "Reference sites", type: "textarea", placeholder: "Links to inspiration" },
    ],
  },
  {
    id: "video",
    name: "Video editing",
    icon: "🎬",
    description: "Short-form, YouTube, or branded video editing",
    fields: [
      { key: "video_type", label: "Video type", type: "select", required: true, options: ["YouTube long-form", "Reels / Shorts", "Ad / commercial", "Podcast clips", "Wedding/Event"] },
      { key: "raw_minutes", label: "Raw footage (minutes)", type: "number" },
      { key: "final_length", label: "Expected final length", type: "text", placeholder: "e.g. 8-10 minutes" },
      { key: "frequency", label: "Frequency", type: "select", options: ["One-off", "Weekly", "Monthly retainer"] },
      { key: "style", label: "Editing style", type: "textarea", placeholder: "Pace, captions, b-roll, motion graphics?" },
      { key: "budget", label: "Budget per video", type: "select", required: true, options: ["< ₹2k", "₹2k - ₹10k", "₹10k - ₹50k", "₹50k+"] },
      { key: "timeline", label: "Turnaround", type: "select", required: true, options: ["24h", "48h", "1 week", "Flexible"] },
      { key: "footage_link", label: "Sample footage link", type: "url", placeholder: "Drive / Dropbox / WeTransfer" },
    ],
  },
  {
    id: "branding",
    name: "Branding & identity",
    icon: "🎨",
    description: "Logo, identity systems, brand guidelines",
    fields: [
      { key: "scope", label: "Scope", type: "select", required: true, options: ["Logo only", "Logo + identity", "Full brand system", "Rebrand"] },
      { key: "industry", label: "Industry", type: "text", required: true },
      { key: "vibe", label: "Brand vibe", type: "textarea", required: true, placeholder: "Modern, playful, luxury, minimal..." },
      { key: "audience", label: "Target audience", type: "textarea", placeholder: "Who you serve" },
      { key: "competitors", label: "Competitor brands", type: "textarea" },
      { key: "deliverables", label: "Required deliverables", type: "textarea", placeholder: "Logo files, color palette, typography, brand book?" },
      { key: "budget", label: "Budget", type: "select", required: true, options: ["< ₹15k", "₹15k - ₹75k", "₹75k - ₹3L", "₹3L+"] },
      { key: "timeline", label: "Timeline", type: "select", required: true, options: ["ASAP", "2 weeks", "1 month", "Flexible"] },
    ],
  },
  {
    id: "saas",
    name: "SaaS MVP",
    icon: "🚀",
    description: "Build an MVP, dashboard, or web product",
    fields: [
      { key: "idea", label: "Product idea (1-2 lines)", type: "textarea", required: true },
      { key: "users", label: "Who will use it?", type: "textarea", required: true },
      { key: "core_features", label: "Must-have features", type: "textarea", required: true, placeholder: "List 3-5 core features" },
      { key: "auth_needed", label: "Authentication required?", type: "select", options: ["Yes — email/password", "Yes — Google/social", "Yes — both", "No"] },
      { key: "payments", label: "Payments needed?", type: "select", options: ["No", "Stripe", "Razorpay", "Other"] },
      { key: "ai_features", label: "AI features?", type: "textarea", placeholder: "What should AI do in the product?" },
      { key: "budget", label: "Budget", type: "select", required: true, options: ["< ₹50k", "₹50k - ₹3L", "₹3L - ₹10L", "₹10L+"] },
      { key: "timeline", label: "Launch target", type: "select", required: true, options: ["2 weeks", "1 month", "3 months", "Flexible"] },
    ],
  },
  {
    id: "automation",
    name: "Automation setup",
    icon: "⚙️",
    description: "Zapier, Make, n8n, custom workflows",
    fields: [
      { key: "tools", label: "Tools to connect", type: "textarea", required: true, placeholder: "e.g. Gmail → Notion → Slack" },
      { key: "trigger", label: "What triggers the workflow?", type: "textarea", required: true },
      { key: "outcome", label: "Desired outcome", type: "textarea", required: true },
      { key: "current_pain", label: "Current manual pain", type: "textarea", placeholder: "What are you doing manually today?" },
      { key: "platform", label: "Preferred platform", type: "select", options: ["No preference", "Zapier", "Make.com", "n8n", "Custom code"] },
      { key: "budget", label: "Budget", type: "select", required: true, options: ["< ₹10k", "₹10k - ₹50k", "₹50k - ₹2L", "₹2L+"] },
      { key: "timeline", label: "Timeline", type: "select", required: true, options: ["This week", "2 weeks", "1 month", "Flexible"] },
    ],
  },
  {
    id: "ghostwriting",
    name: "Ghostwriting / Content",
    icon: "✍️",
    description: "LinkedIn, Twitter, blog, or thought-leadership writing",
    fields: [
      { key: "platform", label: "Platform", type: "select", required: true, options: ["LinkedIn", "Twitter / X", "Blog", "Newsletter", "Multiple"] },
      { key: "voice", label: "Your voice / niche", type: "textarea", required: true, placeholder: "What topics? What tone?" },
      { key: "frequency", label: "Posting frequency", type: "select", required: true, options: ["Daily", "3x / week", "Weekly", "Monthly"] },
      { key: "samples", label: "Sample writing / past posts", type: "textarea", placeholder: "Links or paste examples" },
      { key: "topics", label: "Topics to cover", type: "textarea" },
      { key: "budget", label: "Monthly budget", type: "select", required: true, options: ["< ₹15k", "₹15k - ₹50k", "₹50k - ₹2L", "₹2L+"] },
      { key: "timeline", label: "Start date", type: "select", required: true, options: ["This week", "Next week", "This month", "Flexible"] },
    ],
  },
];