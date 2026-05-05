import {
  Rocket, FileText, DollarSign, Film, ShieldAlert, Brain, Zap, TrendingUp,
  BookOpen, Target, Briefcase, Sparkles,
} from "lucide-react";

export interface Product {
  slug: string;
  name: string;
  tagline: string;
  category: "Content" | "Career" | "Sales" | "Research" | "Workflow";
  icon: any;
  short: string;
  hero: string;
  features: string[];
  useCases: { title: string; body: string }[];
  apiPreview: string;
  pricing: { plan: string; calls: string; price: string }[];
  consumerHref: string; // in-app tool route
}

export const PRODUCTS: Product[] = [
  {
    slug: "hustle-blueprint",
    name: "Hustle Blueprint API",
    tagline: "Convert any niche into a launch-ready 30-day blueprint.",
    category: "Workflow",
    icon: Rocket,
    short: "AI-generated business blueprints with step-by-step launch plans.",
    hero: "Turn a one-line idea into a complete 30-day execution roadmap with milestones, tools, channels and revenue model.",
    features: [
      "Niche → roadmap in <8s",
      "Revenue model + pricing suggestions",
      "Tooling stack recommendations",
      "Branded PDF export endpoint",
    ],
    useCases: [
      { title: "Course platforms", body: "Auto-generate launch plans for student business ideas." },
      { title: "B2B SaaS onboarding", body: "Help users scope their workspace use-case in one click." },
    ],
    apiPreview: `POST /v1/blueprint
{ "idea": "AI-driven Notion templates" }`,
    pricing: [
      { plan: "Starter", calls: "1k / mo", price: "$49" },
      { plan: "Growth", calls: "10k / mo", price: "$249" },
      { plan: "Scale", calls: "100k / mo", price: "Custom" },
    ],
    consumerHref: "/hustle-blueprint",
  },
  {
    slug: "resume-optimizer",
    name: "Resume Optimizer API",
    tagline: "ATS-grade rewrites with role-specific keyword targeting.",
    category: "Career",
    icon: FileText,
    short: "Rewrite, score and tailor resumes for any job description.",
    hero: "Paste a resume + JD, get back an ATS-optimized rewrite, a score and a list of missing keywords.",
    features: ["ATS score 0-100", "Keyword gap analysis", "Section-level rewrites", "PDF export themes"],
    useCases: [
      { title: "Job boards", body: "Offer 'Optimize for this role' as a paid feature." },
      { title: "EdTech", body: "Bundle into student career toolkits." },
    ],
    apiPreview: `POST /v1/resume/optimize\n{ "resume": "...", "job_description": "..." }`,
    pricing: [
      { plan: "Starter", calls: "500 / mo", price: "$39" },
      { plan: "Growth", calls: "5k / mo", price: "$199" },
      { plan: "Scale", calls: "50k / mo", price: "Custom" },
    ],
    consumerHref: "/resume-optimizer",
  },
  {
    slug: "gig-price-calculator",
    name: "Gig Price Calculator API",
    tagline: "Region-aware pricing for any freelance scope in milliseconds.",
    category: "Sales",
    icon: DollarSign,
    short: "Recommend fair, market-rate freelance pricing for any scope.",
    hero: "Feed a project scope, skills and region — get min/avg/max pricing with rationale.",
    features: ["Region-aware (USD/EUR/INR)", "Hourly + fixed", "Margin guidance", "Scope normalization"],
    useCases: [
      { title: "Marketplaces", body: "Auto-suggest pricing on listing creation." },
      { title: "Agencies", body: "Internal sales calculator for proposals." },
    ],
    apiPreview: `POST /v1/price\n{ "scope": "...", "region": "IN" }`,
    pricing: [
      { plan: "Starter", calls: "2k / mo", price: "$29" },
      { plan: "Growth", calls: "20k / mo", price: "$149" },
      { plan: "Scale", calls: "200k / mo", price: "Custom" },
    ],
    consumerHref: "/gig-price-calculator",
  },
  {
    slug: "faceless-content",
    name: "Faceless Content API",
    tagline: "Hook, script, captions and B-roll cues for short-form video.",
    category: "Content",
    icon: Film,
    short: "Generate ready-to-shoot scripts for faceless YouTube/Reels/TikTok.",
    hero: "From a topic, get hook, body, CTA, hashtags, B-roll cues and thumbnail prompts.",
    features: ["Hook + CTA generation", "Hashtag clusters", "Thumbnail prompts", "Multi-platform variants"],
    useCases: [
      { title: "Creator tools", body: "Power a 'Generate script' button in the editor." },
      { title: "Marketing SaaS", body: "Bulk-generate brand-safe shorts." },
    ],
    apiPreview: `POST /v1/content/short\n{ "topic": "AI side hustles", "platform": "reels" }`,
    pricing: [
      { plan: "Starter", calls: "1k / mo", price: "$39" },
      { plan: "Growth", calls: "10k / mo", price: "$199" },
      { plan: "Scale", calls: "100k / mo", price: "Custom" },
    ],
    consumerHref: "/faceless-content",
  },
  {
    slug: "red-flag-scanner",
    name: "Red-Flag Scanner API",
    tagline: "Flag scammy clients, contracts and gigs in one call.",
    category: "Sales",
    icon: ShieldAlert,
    short: "Detect risk patterns in messages, briefs and contract clauses.",
    hero: "Paste any client message, brief or contract — get a risk score and the exact phrases to question.",
    features: ["Risk score 0-100", "Highlighted clauses", "Suggested counter-questions", "Multilingual"],
    useCases: [
      { title: "Freelance platforms", body: "Auto-warn freelancers about risky DMs." },
      { title: "Legal tech", body: "Pre-screen incoming proposals." },
    ],
    apiPreview: `POST /v1/scan\n{ "text": "..." }`,
    pricing: [
      { plan: "Starter", calls: "2k / mo", price: "$29" },
      { plan: "Growth", calls: "20k / mo", price: "$129" },
      { plan: "Scale", calls: "200k / mo", price: "Custom" },
    ],
    consumerHref: "/red-flag-scanner",
  },
  {
    slug: "proposal-draft",
    name: "Proposal Draft API",
    tagline: "Personalized cover letters & proposals that win the gig.",
    category: "Sales",
    icon: FileText,
    short: "Generate tailored proposals from a job post + freelancer profile.",
    hero: "Drop in a job description and a profile blurb — get a calibrated proposal in under 4 seconds.",
    features: ["Tone presets", "Pricing line included", "Localised greetings", "Length controls"],
    useCases: [
      { title: "Job platforms", body: "Boost reply rate with one-click drafts." },
      { title: "Outbound CRMs", body: "Personalize cold outreach at scale." },
    ],
    apiPreview: `POST /v1/proposal\n{ "job": "...", "profile": "..." }`,
    pricing: [
      { plan: "Starter", calls: "1k / mo", price: "$39" },
      { plan: "Growth", calls: "10k / mo", price: "$199" },
      { plan: "Scale", calls: "100k / mo", price: "Custom" },
    ],
    consumerHref: "/proposal-draft",
  },
  {
    slug: "skill-gap",
    name: "Skill Gap Consultant API",
    tagline: "Map current skills → target role with a learning plan.",
    category: "Career",
    icon: Brain,
    short: "Compute skill gaps and recommend a personalized 90-day plan.",
    hero: "Provide a current skillset + target role — get gaps, courses and a weekly milestone plan.",
    features: ["Gap matrix", "Course recommendations", "90-day roadmap", "Confidence scoring"],
    useCases: [
      { title: "L&D platforms", body: "Personalized course funnels." },
      { title: "HR tech", body: "Internal mobility recommendations." },
    ],
    apiPreview: `POST /v1/skills/gap\n{ "have": [...], "want": "..." }`,
    pricing: [
      { plan: "Starter", calls: "1k / mo", price: "$49" },
      { plan: "Growth", calls: "10k / mo", price: "$249" },
      { plan: "Scale", calls: "100k / mo", price: "Custom" },
    ],
    consumerHref: "/skill-gap",
  },
  {
    slug: "ai-tool-bench",
    name: "AI Tool Benchmark API",
    tagline: "Pick the best AI tool for any specific task in one call.",
    category: "Research",
    icon: Zap,
    short: "Cross-tool benchmarks ranked by use-case fit and price.",
    hero: "Describe your task, we return ranked tools with pros, cons, pricing and recommended workflow.",
    features: ["100+ tools indexed", "Use-case scoring", "Pricing diff", "Updated weekly"],
    useCases: [
      { title: "AI directories", body: "Power 'Best for X' rankings." },
      { title: "Newsletters", body: "Auto-write tool comparison posts." },
    ],
    apiPreview: `POST /v1/tools/rank\n{ "task": "transcription" }`,
    pricing: [
      { plan: "Starter", calls: "1k / mo", price: "$39" },
      { plan: "Growth", calls: "10k / mo", price: "$199" },
      { plan: "Scale", calls: "100k / mo", price: "Custom" },
    ],
    consumerHref: "/ai-tools",
  },
  {
    slug: "gig-arbitrage",
    name: "Gig Arbitrage API",
    tagline: "Spot underpriced gigs you can fulfil with AI for higher margins.",
    category: "Research",
    icon: TrendingUp,
    short: "Find gigs where AI compresses delivery cost.",
    hero: "Scan a category — get a list of high-margin opportunities with a delivery playbook.",
    features: ["Margin estimation", "Tooling map", "Demand signals", "Region filters"],
    useCases: [
      { title: "Agencies", body: "Daily lead briefs by category." },
      { title: "Freelance bootcamps", body: "Live opportunity feed for cohorts." },
    ],
    apiPreview: `POST /v1/arbitrage\n{ "category": "logo-design" }`,
    pricing: [
      { plan: "Starter", calls: "500 / mo", price: "$59" },
      { plan: "Growth", calls: "5k / mo", price: "$299" },
      { plan: "Scale", calls: "50k / mo", price: "Custom" },
    ],
    consumerHref: "/gig-arbitrage",
  },
  {
    slug: "knowledge-hub",
    name: "Knowledge Hub API",
    tagline: "Searchable library of high-signal prompts & playbooks.",
    category: "Workflow",
    icon: BookOpen,
    short: "Embeddings-backed search over 5k+ vetted prompts and SOPs.",
    hero: "Hit a single endpoint with a question — get the top playbooks, prompts and step-by-step recipes.",
    features: ["Vector + lexical search", "Citations", "Topic facets", "Daily updates"],
    useCases: [
      { title: "Internal tools", body: "Embed in Slack/Notion to answer team Qs." },
      { title: "AI assistants", body: "Use as a high-quality retrieval layer." },
    ],
    apiPreview: `POST /v1/knowledge/search\n{ "q": "cold email opener" }`,
    pricing: [
      { plan: "Starter", calls: "5k / mo", price: "$29" },
      { plan: "Growth", calls: "50k / mo", price: "$149" },
      { plan: "Scale", calls: "500k / mo", price: "Custom" },
    ],
    consumerHref: "/knowledge-hub",
  },
  {
    slug: "lead-finder",
    name: "Lead Finder API",
    tagline: "Scan public signals for buying-intent problem statements.",
    category: "Sales",
    icon: Target,
    short: "Source qualified leads from forum & social signals.",
    hero: "Get a stream of leads with the original problem post, contact context and a suggested opener.",
    features: ["Forum + social signals", "Suggested opener", "Pipeline stages", "Webhook delivery"],
    useCases: [
      { title: "Agencies", body: "Daily inbound feed for SDRs." },
      { title: "B2B SaaS", body: "Auto-enrich your CRM with intent leads." },
    ],
    apiPreview: `POST /v1/leads\n{ "niche": "shopify devs" }`,
    pricing: [
      { plan: "Starter", calls: "500 / mo", price: "$79" },
      { plan: "Growth", calls: "5k / mo", price: "$399" },
      { plan: "Scale", calls: "50k / mo", price: "Custom" },
    ],
    consumerHref: "/problem-leads",
  },
  {
    slug: "sure-hit-jobs",
    name: "Sure-Hit Jobs API",
    tagline: "Filter job feeds down to roles you'll realistically land.",
    category: "Career",
    icon: Briefcase,
    short: "Probability-of-hire scoring on top of any job feed.",
    hero: "Pipe a feed of jobs + a profile — get a ranked list with hire-probability and reasoning.",
    features: ["Hire probability", "Skill match heatmap", "Salary calibration", "Webhook delivery"],
    useCases: [
      { title: "Job boards", body: "'Best matches for you' module." },
      { title: "Career coaches", body: "Curate ranked lists for clients." },
    ],
    apiPreview: `POST /v1/jobs/score\n{ "profile": "...", "jobs": [...] }`,
    pricing: [
      { plan: "Starter", calls: "1k / mo", price: "$49" },
      { plan: "Growth", calls: "10k / mo", price: "$249" },
      { plan: "Scale", calls: "100k / mo", price: "Custom" },
    ],
    consumerHref: "/sure-hit-jobs",
  },
];

export const getProduct = (slug: string) => PRODUCTS.find((p) => p.slug === slug);