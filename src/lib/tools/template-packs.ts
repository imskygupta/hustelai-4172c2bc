/**
 * Per-tool template packs, tier-gated.
 * Free: 2 templates · Pro: +2 · Elite: +3 · Infinity: +3.
 * The picker is decorative on free tools (selecting a locked one upsells),
 * but the shape is consistent so each tool can wire its own apply() later.
 */

export type Tier = "free" | "pro" | "elite" | "infinity";
export interface TemplatePack { id: string; name: string; vibe: string; tier: Tier }

const T = (id: string, name: string, vibe: string, tier: Tier): TemplatePack => ({ id, name, vibe, tier });

export const TEMPLATE_PACKS: Record<string, TemplatePack[]> = {
  invoice: [
    T("modern", "Modern", "Clean default", "free"),
    T("classic", "Classic", "B&W formal", "free"),
    T("studio", "Minimal Studio", "Designer-grade", "pro"),
    T("agency-bold", "Agency Bold", "Big numbers, brand bar", "pro"),
    T("boutique-luxe", "Boutique Luxe", "Serif + gold", "elite"),
    T("stripe-clean", "Stripe-Clean", "SaaS receipt feel", "elite"),
    T("investor", "Investor-Grade", "Multi-page, schedule", "elite"),
    T("animated-hero", "Animated Hero", "PDF cover header", "infinity"),
    T("multi-currency", "Multi-Currency", "FX table built-in", "infinity"),
    T("whitelabel", "Whitelabel Ultra", "Zero HustleAI marks", "infinity"),
  ],
  proposal: [
    T("classic", "Classic", "3-page essentials", "free"),
    T("crisp", "Crisp", "One-pager pitch", "free"),
    T("agency", "Agency Pro", "Cover + case studies", "pro"),
    T("retainer", "Retainer", "Monthly engagement", "pro"),
    T("enterprise", "Enterprise", "ROI calculator block", "elite"),
    T("storybook", "Storybook", "Narrative + visuals", "elite"),
    T("investor-pitch", "Investor Pitch", "Deck-style", "elite"),
    T("interactive", "Interactive Web", "Live web proposal", "infinity"),
    T("animated-cover", "Animated Cover", "Motion PDF hero", "infinity"),
    T("whitelabel", "Whitelabel Ultra", "Your brand only", "infinity"),
  ],
  contract: [
    T("freelance", "Freelance Standard", "Plain-English", "free"),
    T("nda", "Mutual NDA", "Lawyer-reviewed", "free"),
    T("retainer", "Retainer Agreement", "Monthly clauses", "pro"),
    T("ip-transfer", "IP Transfer", "Asset handoff", "pro"),
    T("ms-services", "Master Services", "MSA + SOW", "elite"),
    T("equity", "Equity Sweat", "Token / vesting", "elite"),
    T("intl", "International", "EU + US + IN ready", "elite"),
    T("animated-cover", "Animated Cover", "Branded PDF hero", "infinity"),
    T("multi-party", "Multi-Party", "3+ signers", "infinity"),
    T("whitelabel", "Whitelabel Ultra", "Zero HustleAI marks", "infinity"),
  ],
  "pricing-calculator": [
    T("starter", "Starter", "3-tier classic", "free"),
    T("value", "Value Ladder", "Anchor + premium", "free"),
    T("agency", "Agency Retainer", "Monthly tiers", "pro"),
    T("productized", "Productized Service", "Fixed-scope", "pro"),
    T("enterprise", "Enterprise", "Custom + RFP", "elite"),
    T("usage", "Usage-Based", "Metered SaaS", "elite"),
  ],
  "portfolio-bio": [
    T("minimal", "Minimal", "Single-column", "free"),
    T("split", "Split-Hero", "Image + intro", "free"),
    T("editorial", "Editorial", "Magazine-style", "pro"),
    T("dark-pro", "Dark Pro", "Studio dark", "pro"),
    T("animated", "Animated", "Motion blocks", "elite"),
    T("whitelabel", "Whitelabel Ultra", "Custom domain", "infinity"),
  ],
  "intake-form": [
    T("design", "Design Project", "Brand brief", "free"),
    T("video", "Video Editor", "Footage + cuts", "free"),
    T("consulting", "Consulting Discovery", "Goals + budget", "free"),
    T("dev", "Dev Sprint", "Stack + deadline", "pro"),
    T("photography", "Photography", "Shoot + style", "pro"),
    T("legal", "Legal Onboarding", "KYC + scope", "elite"),
    T("conditional", "Conditional Logic", "Smart branching", "infinity"),
  ],
  "business-card": [
    T("modern", "Modern", "Brand-bar", "free"),
    T("mono", "Monochrome", "Pure type", "free"),
    T("luxe", "Luxe", "Foil + serif", "pro"),
    T("studio", "Studio", "Designer mark", "pro"),
    T("metal", "Metal", "Brushed steel", "elite"),
    T("animated", "Animated NFC", "Web-tap card", "infinity"),
  ],
  "content-calendar": [
    T("creator", "Solo Creator", "5/wk minimal", "free"),
    T("growth", "Growth", "Pillars + hooks", "free"),
    T("agency", "Agency Multi-Brand", "Multi-account", "pro"),
    T("launch", "Launch Sprint", "30-day countdown", "pro"),
    T("youtube", "YouTube System", "Long + Shorts", "elite"),
    T("automation", "AI Automation", "Auto-rewrite", "infinity"),
  ],
};

export function totalUnlocks(toolKey: string, tier: Tier): { used: number; total: number } {
  const all = TEMPLATE_PACKS[toolKey] || [];
  const order: Tier[] = ["free", "pro", "elite", "infinity"];
  const max = order.indexOf(tier);
  return { used: all.filter((t) => order.indexOf(t.tier) <= max).length, total: all.length };
}