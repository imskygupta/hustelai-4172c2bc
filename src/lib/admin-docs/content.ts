import { LucideIcon, Activity, Bot, CreditCard, Database, FileText, Flag, Lock, Mail, MessageSquare, Radio, ShieldCheck, Sparkles, Users, Workflow, Zap, Cog, Inbox, Compass } from "lucide-react";
import type { OpsBadgeKind } from "@/components/admin/OpsBadge";

export type DocSection = {
  id: string;
  title: string;
  category: string;
  icon: LucideIcon;
  badges?: OpsBadgeKind[];
  summary: string;
  body: { heading: string; text?: string; code?: string; bullets?: string[] }[];
  related?: { label: string; href: string }[];
  keywords?: string;
};

export const DOC_CATEGORIES = [
  "Foundations",
  "Auth & Identity",
  "Payments",
  "Bots & Telegram",
  "AI & Workflows",
  "Events & Webhooks",
  "Runtime & Ops",
  "Content & Growth",
] as const;

export const ADMIN_DOCS: DocSection[] = [
  {
    id: "platform-overview",
    title: "Platform overview",
    category: "Foundations",
    icon: Compass,
    badges: ["production"],
    summary: "Mental model: marketing dashboard, immersive workspace, isolated docs, and the operator panel you're reading now.",
    body: [
      { heading: "Surfaces", bullets: [
        "hustlaiapp.in — marketing, dashboard, billing, onboarding, settings, blog",
        "workspace.hustlaiapp.in — immersive Workspace OS (deep work, projects, AI canvas)",
        "docs.hustlaiapp.in — public product documentation",
        "/admin-dashboard/* — operator panel (this surface, super-admin only)",
      ]},
      { heading: "Backends", bullets: [
        "Primary Supabase (vbnqaovxatucrgtnggea) — auth, billing, content, runtime",
        "Secondary DB — Work Hub (freelancer OS sub-routes)",
        "Third DB (qeswhaytgvosfzzgraef) — Community/Forum/Discord",
      ]},
      { heading: "Stack", text: "React + Vite frontend, Supabase RLS-backed APIs, edge functions for webhooks/AI/Telegram. No Next.js. GSAP for animation. Lovable Cloud for managed backend." },
    ],
  },
  {
    id: "user-tiers",
    title: "User tiers & entitlements",
    category: "Foundations",
    icon: Sparkles,
    badges: ["production"],
    summary: "free → pro → elite → infinity. Limits live in tier_limits, feature toggles in feature_access, per-user grants in capability_overrides.",
    body: [
      { heading: "Tier table", bullets: [
        "free — discovery, capped searches/AI calls",
        "pro — daily working caps, full AI tools",
        "elite — vault, higher caps, priority queues",
        "infinity — courses, templates, groups, near-unlimited",
      ]},
      { heading: "Where to change", bullets: [
        "/admin/usage-governance — tier_limits, feature_access, overrides",
        "/admin/feature-flags — module enable/disable per tier",
      ]},
    ],
    related: [
      { label: "Usage Governance", href: "/admin/usage-governance" },
      { label: "Feature Flags", href: "/admin/feature-flags" },
    ],
  },
  {
    id: "auth-system",
    title: "Auth & signup hardening",
    category: "Auth & Identity",
    icon: Lock,
    badges: ["production", "dangerous"],
    summary: "Supabase auth + Gmail-only policy + signup-guard edge fn + signup_blocked_log audit.",
    body: [
      { heading: "Policy", bullets: [
        "Gmail-only signups & password resets (src/lib/auth/email-policy.ts)",
        "Hard-blocked: samratakash0000@gmail.com, *@skycart.xyz, common disposable domains",
        "OTP verification via custom 6-digit code (Edge Function delivery)",
      ]},
      { heading: "Trap", text: "/admin route is a public honeypot (AdminBlock). Real admin login lives at /imskygupta-admin." },
      { heading: "Audit", text: "Blocked attempts → signup_blocked_log (RLS: admin only) and an admin alert via SkyMedia bot." },
      { heading: "Safety net", text: "Supabase 'Lock broken' triggers forced logout client-side. Auth resilience handles refresh-token loops." },
    ],
    related: [
      { label: "Roles", href: "/admin-dashboard?section=roles" },
      { label: "Signup blocked log", href: "/admin-dashboard?section=signup-blocked" },
    ],
  },
  {
    id: "google-oauth",
    title: "Google sign-in",
    category: "Auth & Identity",
    icon: ShieldCheck,
    badges: ["production"],
    summary: "Google OAuth via Supabase with skipBrowserRedirect. Callback domain locked to https://hustlaiapp.in/.",
    body: [
      { heading: "Notes", bullets: [
        "Provider must be enabled in Supabase auth settings",
        "Redirect URL: https://hustlaiapp.in/auth/callback",
        "Front-end calls signInWithOAuth({ provider: 'google', options: { skipBrowserRedirect: true }})",
      ]},
    ],
  },
  {
    id: "payments-cashfree",
    title: "Payments — Cashfree",
    category: "Payments",
    icon: CreditCard,
    badges: ["production", "dangerous"],
    summary: "Cashfree integration with explicit JWT bypass on payment edge functions. Status redirects via /payment/status.",
    body: [
      { heading: "Flow", bullets: [
        "Frontend creates order via cashfree-create-order edge fn",
        "User completes on Cashfree → redirected to /payment/status",
        "cashfree-webhook updates orders + wallet on success",
      ]},
      { heading: "Wallet", text: "Wallet credits deducted per AI tool tier. Tables: user_wallet, wallet_ledger." },
      { heading: "Bypass", text: "Cashfree webhook is the ONLY edge function with verify_jwt=false intentionally." },
    ],
    related: [
      { label: "Payments Review", href: "/admin-dashboard?section=payments" },
      { label: "Dodo Payments", href: "/admin-dashboard?section=dodo-payments" },
    ],
  },
  {
    id: "payments-dodo",
    title: "Payments — Dodo",
    category: "Payments",
    icon: CreditCard,
    badges: ["production"],
    summary: "Subscription billing through Dodo for Pro/Elite/Infinity tiers; coupons managed in /admin-dashboard?section=dodo-payments.",
    body: [
      { heading: "Where", bullets: [
        "Plans: /plans (public), /admin/payments-review (ops)",
        "Coupons: DodoCouponsPanel section",
        "Webhooks update subscription_tier on profiles",
      ]},
    ],
  },
  {
    id: "telegram-architecture",
    title: "Telegram — two bots, strict separation",
    category: "Bots & Telegram",
    icon: Radio,
    badges: ["production", "internal"],
    summary: "@hustlaiapp_bot is user-facing (interactive). @theskymediabot is receive-only ops alerts. Never merge.",
    body: [
      { heading: "User bot — telegram-webhook", bullets: [
        "/start, /help, link account → branded inline keyboards",
        "AI mentor (HustleBot) replies, with admin intervention",
        "Linking via issue_telegram_link_token RPC + /start <token>",
      ]},
      { heading: "Admin bot — skymedia-webhook", bullets: [
        "Receive-only: silently drops all inbound updates",
        "One-time silent-channel notice on first contact",
        "Allowlist: chat_id 1378192648 only",
      ]},
      { heading: "Routing", text: "admin-bot-notify formats events (signup_blocked, auth_suspicious, payment.*, export.failed, test) and sends via SkyMedia bot." },
    ],
    related: [
      { label: "Telegram Ops Center", href: "/admin/communications/telegram" },
      { label: "Telegram Control", href: "/admin/telegram-control" },
    ],
  },
  {
    id: "telegram-broadcasts",
    title: "Telegram broadcasts & link tokens",
    category: "Bots & Telegram",
    icon: Bot,
    badges: ["production", "dangerous"],
    summary: "Tier-targeted broadcasts via broadcast_jobs queue; secure 10-min link tokens for account linking.",
    body: [
      { heading: "Broadcast", bullets: [
        "Audience resolved by profiles.subscription_tier + telegram_chat_id",
        "telegram-broadcast edge fn paces sends 50ms apart",
        "broadcast_jobs.{sent_count,failed_count,status} updated atomically",
      ]},
      { heading: "Linking", text: "issue_telegram_link_token(_user) → user opens t.me/<bot>?start=<token> → consume_telegram_link_token(_token) maps chat_id." },
    ],
  },
  {
    id: "ai-providers",
    title: "AI providers & job queue",
    category: "AI & Workflows",
    icon: Zap,
    badges: ["production"],
    summary: "Multi-provider router (Gemini, Zhipu, LongCat) over Lovable AI Gateway. Heavy work goes through ai_jobs queue.",
    body: [
      { heading: "Routing", bullets: [
        "Default: google/gemini-2.5-flash (cheap, balanced)",
        "Reasoning: openai/gpt-5 / gpt-5.2",
        "Image: gemini-3-pro-image-preview / nano-banana-2",
      ]},
      { heading: "Job queue", bullets: [
        "ai_jobs table — status: queued|running|done|failed",
        "Worker edge fn polls and dispatches",
        "/admin/ai-jobs surfaces status + replay",
      ]},
    ],
    related: [{ label: "AI Job Queue", href: "/admin/ai-jobs" }],
  },
  {
    id: "workflow-engine",
    title: "Workflow / automation engine",
    category: "AI & Workflows",
    icon: Workflow,
    badges: ["experimental", "internal"],
    summary: "DB-driven automations triggered by events. Define triggers + steps; runtime can be paused per workflow.",
    body: [
      { heading: "Concepts", bullets: [
        "Trigger: event pattern (payment.completed, signup.blocked, …)",
        "Steps: ordered actions (send-email, telegram-notify, ai-job, http)",
        "Run log: every execution recorded with input/output",
      ]},
      { heading: "Safety", text: "Runtime kill switch on telegram_bots.runtime_enabled and per-workflow enabled flags. Always test in dry-run first." },
    ],
    related: [{ label: "Workflow Engine", href: "/admin/automations" }],
  },
  {
    id: "events-pipeline",
    title: "Events & dispatcher",
    category: "Events & Webhooks",
    icon: Activity,
    badges: ["production"],
    summary: "Producers emit events → event-dispatcher reads notification_routes → fans out to email / Telegram / workflows.",
    body: [
      { heading: "Producers", bullets: [
        "Auth: signup.blocked, auth.suspicious",
        "Billing: payment.created, payment.completed, payment.failed",
        "Exports: export.queued, export.delivered, export.failed",
        "AI: aijob.failed, aijob.long_running",
      ]},
      { heading: "Routing", text: "notification_routes maps event_pattern → channel + target_bot_id + severity_min. Empty table falls back to in-code defaults." },
    ],
  },
  {
    id: "webhooks",
    title: "Webhook surface",
    category: "Events & Webhooks",
    icon: Inbox,
    badges: ["production", "dangerous"],
    summary: "All webhooks are edge functions. Most require JWT; payment + telegram bot webhooks are the explicit exceptions.",
    body: [
      { heading: "Inbound", bullets: [
        "cashfree-webhook — JWT-bypassed, signature verified",
        "telegram-webhook / skymedia-webhook — JWT-bypassed, secret-token header check",
        "newsletter inbound — Brevo callback, signature check",
      ]},
      { heading: "Outbound", bullets: [
        "admin-bot-notify → Telegram",
        "event-dispatcher → email / Telegram",
      ]},
    ],
  },
  {
    id: "runtime-controls",
    title: "Runtime controls & kill switches",
    category: "Runtime & Ops",
    icon: Cog,
    badges: ["production", "dangerous"],
    summary: "Pause modules, freeze AI providers, disable bots — all without redeploy.",
    body: [
      { heading: "Where", bullets: [
        "/admin/runtime — global runtime toggles",
        "/admin/feature-flags — per-tier module gating",
        "/admin/usage-governance — tier limits + overrides",
      ]},
      { heading: "Safe defaults", text: "Production caps stay conservative. Increase a single tier's max before opening a feature globally." },
    ],
  },
  {
    id: "exports",
    title: "Exports pipeline",
    category: "Runtime & Ops",
    icon: FileText,
    badges: ["production"],
    summary: "PDF roadmaps, resumes, blueprints, intake submissions queued and delivered via Telegram or email.",
    body: [
      { heading: "Flow", bullets: [
        "Client requests export → export_jobs row",
        "Worker generates artifact → uploads to storage",
        "event-dispatcher routes export.delivered/failed",
      ]},
    ],
  },
  {
    id: "content-pipeline",
    title: "Editorial / blog pipeline",
    category: "Content & Growth",
    icon: FileText,
    badges: ["production"],
    summary: "Topic intel → AI draft → editorial pipeline → SEO health → indexing ops.",
    body: [
      { heading: "Stages", bullets: [
        "Topic Intelligence — clusters, gaps",
        "AI Publishing Queue — drafts + scheduling",
        "Editorial Ops — review, edit, publish",
        "SEO Health + Indexing Ops — sitemap, IndexNow, Bing/Google/Yandex pings",
      ]},
    ],
  },
  {
    id: "newsletter",
    title: "Newsletter automation",
    category: "Content & Growth",
    icon: Mail,
    badges: ["production"],
    summary: "Brevo + custom templates. Capture via newsletter capture lib, send via mailing-providers.",
    body: [
      { heading: "Where", bullets: [
        "/admin/communications/newsletter — broadcast composer",
        "Templates: EmailTemplatesPanel",
        "Providers: MailingProvidersPanel (failover order)",
      ]},
    ],
  },
  {
    id: "community-forum",
    title: "Community / forum",
    category: "Content & Growth",
    icon: MessageSquare,
    badges: ["production"],
    summary: "Reddit-like forum on the third Supabase DB (qeswhaytgvosfzzgraef). Bot moderation + AI auto-replies.",
    body: [
      { heading: "Notes", bullets: [
        "KYC verification gates posting privileges",
        "AI auto-reply for low-engagement threads",
        "Forum posts admin section moderates flagged content",
      ]},
    ],
  },
];
