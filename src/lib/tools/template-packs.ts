/**
 * Per-tool template packs, tier-gated.
 * Free: 2 templates · Pro: +2 · Elite: +4-5 · Infinity: +8-9.
 * The picker is decorative on free tools (selecting a locked one upsells),
 * but the shape is consistent so each tool can wire its own apply() later.
 */

export type Tier = "free" | "pro" | "elite" | "infinity";
export interface TemplatePack { id: string; name: string; vibe: string; tier: Tier }

const T = (id: string, name: string, vibe: string, tier: Tier): TemplatePack => ({ id, name, vibe, tier });

export const TEMPLATE_PACKS: Record<string, TemplatePack[]> = {
  invoice: [
    // free
    T("modern", "Modern", "Clean default", "free"),
    T("classic", "Classic", "B&W formal", "free"),
    // pro
    T("studio", "Minimal Studio", "Designer-grade", "pro"),
    T("agency-bold", "Agency Bold", "Big numbers, brand bar", "pro"),
    // elite (5)
    T("boutique-luxe", "Boutique Luxe", "Serif + gold", "elite"),
    T("stripe-clean", "Stripe-Clean", "SaaS receipt feel", "elite"),
    T("investor", "Investor-Grade", "Multi-page, schedule", "elite"),
    T("dark-mode", "Dark Mode", "Midnight UI invoice", "elite"),
    T("gradient-brand", "Gradient Brand", "Vibrant header bars", "elite"),
    // infinity (9)
    T("animated-hero", "Animated Hero", "PDF cover header", "infinity"),
    T("multi-currency", "Multi-Currency", "FX table built-in", "infinity"),
    T("whitelabel", "Whitelabel Ultra", "Zero HustleAI marks", "infinity"),
    T("subscription", "Subscription", "Recurring billing layout", "infinity"),
    T("milestone", "Milestone", "Phase-based billing", "infinity"),
    T("expense-split", "Expense Split", "Shared cost breakdown", "infinity"),
    T("crypto-ready", "Crypto Ready", "Web3 payment fields", "infinity"),
    T("ai-summary", "AI Summary", "Auto-narrative footer", "infinity"),
    T("enterprise-bundle", "Enterprise Bundle", "Consolidated group invoice", "infinity"),
  ],
  proposal: [
    // free
    T("classic", "Classic", "3-page essentials", "free"),
    T("crisp", "Crisp", "One-pager pitch", "free"),
    // pro
    T("agency", "Agency Pro", "Cover + case studies", "pro"),
    T("retainer", "Retainer", "Monthly engagement", "pro"),
    // elite (5)
    T("enterprise", "Enterprise", "ROI calculator block", "elite"),
    T("storybook", "Storybook", "Narrative + visuals", "elite"),
    T("investor-pitch", "Investor Pitch", "Deck-style", "elite"),
    T("product-launch", "Product Launch", "Go-to-market arc", "elite"),
    T("partnership", "Partnership", "Joint-venture terms", "elite"),
    // infinity (9)
    T("interactive", "Interactive Web", "Live web proposal", "infinity"),
    T("animated-cover", "Animated Cover", "Motion PDF hero", "infinity"),
    T("whitelabel", "Whitelabel Ultra", "Your brand only", "infinity"),
    T("ai-generated", "AI Generated", "Auto-written from brief", "infinity"),
    T("micro-saas", "Micro-SaaS", "API + pricing tiers", "infinity"),
    T("grant", "Grant Proposal", "NGO / gov format", "infinity"),
    T("whitepaper", "Whitepaper", "Deep technical", "infinity"),
    T("event-sponsorship", "Event Sponsorship", "Packages + perks", "infinity"),
    T("franchise", "Franchise", "Territory + ops manual", "infinity"),
  ],
  contract: [
    // free
    T("freelance", "Freelance Standard", "Plain-English", "free"),
    T("nda", "Mutual NDA", "Lawyer-reviewed", "free"),
    // pro
    T("retainer", "Retainer Agreement", "Monthly clauses", "pro"),
    T("ip-transfer", "IP Transfer", "Asset handoff", "pro"),
    // elite (5)
    T("ms-services", "Master Services", "MSA + SOW", "elite"),
    T("equity", "Equity Sweat", "Token / vesting", "elite"),
    T("intl", "International", "EU + US + IN ready", "elite"),
    T("saas-terms", "SaaS Terms", "Subscription SLA", "elite"),
    T("advisory", "Advisory", "Board + mentor terms", "elite"),
    // infinity (9)
    T("animated-cover", "Animated Cover", "Branded PDF hero", "infinity"),
    T("multi-party", "Multi-Party", "3+ signers", "infinity"),
    T("whitelabel", "Whitelabel Ultra", "Zero HustleAI marks", "infinity"),
    T("smart-clauses", "Smart Clauses", "Auto-negotiate blocks", "infinity"),
    T("token-gated", "Token Gated", "NFT access lock", "infinity"),
    T("dao-llc", "DAO LLC", "On-chain entity", "infinity"),
    T("ai-escrow", "AI Escrow", "Milestone release logic", "infinity"),
    T("white-glove", "White Glove", "Concierge drafting", "infinity"),
    T("custom-law", "Custom Law", "Pick jurisdiction set", "infinity"),
  ],
  "pricing-calculator": [
    // free
    T("starter", "Starter", "3-tier classic", "free"),
    T("value", "Value Ladder", "Anchor + premium", "free"),
    // pro
    T("agency", "Agency Retainer", "Monthly tiers", "pro"),
    T("productized", "Productized Service", "Fixed-scope", "pro"),
    // elite (5)
    T("enterprise", "Enterprise", "Custom + RFP", "elite"),
    T("usage", "Usage-Based", "Metered SaaS", "elite"),
    T("dynamic", "Dynamic", "Real-time market adjust", "elite"),
    T("freemium", "Freemium", "Upgrade path map", "elite"),
    T("bundle", "Bundle Builder", "Mix-and-match", "elite"),
    // infinity (9)
    T("ai-optimize", "AI Optimize", "Profit-max solver", "infinity"),
    T("geo-price", "Geo Price", "Region-based tiers", "infinity"),
    T("competitor", "Competitor", "Live benchmark mode", "infinity"),
    T("simulator", "Simulator", "What-if revenue", "infinity"),
    T("team-seats", "Team Seats", "Per-seat scaling", "infinity"),
    T("white-label", "White Label", "Reseller margin", "infinity"),
    T("commission", "Commission", "Affiliate splits", "infinity"),
    T("crypto", "Crypto", "Token + gas fees", "infinity"),
    T("enterprise-deal", "Enterprise Deal", "CFO-ready deck", "infinity"),
  ],
  "portfolio-bio": [
    // free
    T("minimal", "Minimal", "Single-column", "free"),
    T("split", "Split-Hero", "Image + intro", "free"),
    // pro
    T("editorial", "Editorial", "Magazine-style", "pro"),
    T("dark-pro", "Dark Pro", "Studio dark", "pro"),
    // elite (5)
    T("animated", "Animated", "Motion blocks", "elite"),
    T("case-study", "Case Study", "Project deep-dives", "elite"),
    T("timeline", "Timeline", "Career arc scroll", "elite"),
    T("gallery", "Gallery", "Masonry work grid", "elite"),
    T("resume", "Resume", "ATS + design hybrid", "elite"),
    // infinity (9)
    T("whitelabel", "Whitelabel Ultra", "Custom domain", "infinity"),
    T("interactive", "Interactive", "Hover-state stories", "infinity"),
    T("video-hero", "Video Hero", "Background reel", "infinity"),
    T("3d-tilt", "3D Tilt", "Card perspective", "infinity"),
    T("ai-persona", "AI Persona", "Auto-tone shift", "infinity"),
    T("lead-gen", "Lead Gen", "Inline booking form", "infinity"),
    T("analytics", "Analytics", "Live view counter", "infinity"),
    T("multi-lang", "Multi Lang", "Auto-translate switch", "infinity"),
    T("nft-badge", "NFT Badge", "On-chain creds", "infinity"),
  ],
  "intake-form": [
    // free
    T("design", "Design Project", "Brand brief", "free"),
    T("video", "Video Editor", "Footage + cuts", "free"),
    T("consulting", "Consulting Discovery", "Goals + budget", "free"),
    // pro
    T("dev", "Dev Sprint", "Stack + deadline", "pro"),
    T("photography", "Photography", "Shoot + style", "pro"),
    // elite (5)
    T("legal", "Legal Onboarding", "KYC + scope", "elite"),
    T("coaching", "Coaching", "Session booking", "elite"),
    T("event", "Event Planning", "Venue + guest flow", "elite"),
    T("medical", "Medical Intake", "History + consent", "elite"),
    T("real-estate", "Real Estate", "Property brief", "elite"),
    // infinity (9)
    T("conditional", "Conditional Logic", "Smart branching", "infinity"),
    T("ai-scoring", "AI Scoring", "Auto-lead grade", "infinity"),
    T("video-upload", "Video Upload", "Async video answers", "infinity"),
    T("multi-step", "Multi-Step", "Save + resume", "infinity"),
    T("white-label", "White Label", "Custom CSS + domain", "infinity"),
    T("api-webhook", "API Webhook", "Zapier + Make ready", "infinity"),
    T("payment-deposit", "Payment Deposit", "Collect upfront", "infinity"),
    T("e-sign", "E-Sign", "Inline contract link", "infinity"),
    T("crm-sync", "CRM Sync", "Auto HubSpot / Salesforce", "infinity"),
  ],
  "business-card": [
    // free
    T("modern", "Modern", "Brand-bar", "free"),
    T("mono", "Monochrome", "Pure type", "free"),
    // pro
    T("luxe", "Luxe", "Foil + serif", "pro"),
    T("studio", "Studio", "Designer mark", "pro"),
    // elite (5)
    T("metal", "Metal", "Brushed steel", "elite"),
    T("glass", "Glass", "Frosted layers", "elite"),
    T("neon", "Neon", "Cyber glow", "elite"),
    T("botanical", "Botanical", "Organic print", "elite"),
    T("architect", "Architect", "Grid + blueprint", "elite"),
    // infinity (9)
    T("animated", "Animated NFC", "Web-tap card", "infinity"),
    T("ar-card", "AR Card", "Scan for 3D pop", "infinity"),
    T("video-back", "Video Back", "Loop background", "infinity"),
    T("crypto-badge", "Crypto Badge", "Wallet QR + chain", "infinity"),
    T("ai-avatar", "AI Avatar", "Generated portrait", "infinity"),
    T("spotify", "Spotify", "Now-playing embed", "infinity"),
    T("dark-mode", "Dark Mode", "OLED black", "infinity"),
    T("hologram", "Hologram", "Iridescent foil", "infinity"),
    T("signature", "Signature", "Handwritten name", "infinity"),
  ],
  "content-calendar": [
    // free
    T("creator", "Solo Creator", "5/wk minimal", "free"),
    T("growth", "Growth", "Pillars + hooks", "free"),
    // pro
    T("agency", "Agency Multi-Brand", "Multi-account", "pro"),
    T("launch", "Launch Sprint", "30-day countdown", "pro"),
    // elite (5)
    T("youtube", "YouTube System", "Long + Shorts", "elite"),
    T("podcast", "Podcast", "Episode arcs", "elite"),
    T("newsletter", "Newsletter", "Weekly deep-dives", "elite"),
    T("b2b", "B2B", "LinkedIn thoughtlead", "elite"),
    T("seasonal", "Seasonal", "Holiday + trend", "elite"),
    // infinity (9)
    T("automation", "AI Automation", "Auto-rewrite", "infinity"),
    T("cross-platform", "Cross-Platform", "Repurpose engine", "infinity"),
    T("viral", "Viral", "Trend-jack alerts", "infinity"),
    T("collab", "Collab", "Guest + swap", "infinity"),
    T("ads", "Paid Ads", "Creative testing", "infinity"),
    T("local-seo", "Local SEO", "Geo-content map", "infinity"),
    T("affiliate", "Affiliate", "Review + link", "infinity"),
    T("community", "Community", "UGC prompts", "infinity"),
    T("evergreen", "Evergreen", "Auto-recycle hits", "infinity"),
  ],
};

export function totalUnlocks(toolKey: string, tier: Tier): { used: number; total: number } {
  const all = TEMPLATE_PACKS[toolKey] || [];
  const order: Tier[] = ["free", "pro", "elite", "infinity"];
  const max = order.indexOf(tier);
  return { used: all.filter((t) => order.indexOf(t.tier) <= max).length, total: all.length };
}
