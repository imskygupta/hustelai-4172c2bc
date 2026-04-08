## Phase 1: Payment Flow & Wallet System

### 1. Update Cashfree Credentials
- Update `CASHFREE_APP_ID` and `CASHFREE_SECRET_KEY` secrets with new production credentials

### 2. Database: Wallet & Payment Tracking
- Create `user_wallets` table (user_id, balance, currency)
- Create `wallet_transactions` table (user_id, amount, type, description, payment_id, status)
- Create `social_links` table for admin-managed social media links
- Create `bonus_kits` table for admin-managed promotional links/ads
- Add `payment_status_logs` to track payment lifecycle (initiated → processing → confirmed → subscription given)

### 3. Edge Function: Enhanced Cashfree Payment
- Update `cashfree-payment` to handle:
  - Subscription plans (existing)
  - Wallet top-up (new: ₹100, ₹200, ₹500 options = 10, 20, 50 searches)
  - Payment status lifecycle tracking with logs
  - Admin log of who initiated what

### 4. Payment Status & Redirect Page
- Create `/payment-status` page showing transparent flow:
  - Payment under process → Confirmed → Subscription given
  - Confetti/celebration animation on success
  - Redirect to account/billing section
  - Show bonus kit link (admin-configurable)

### 5. Updated Pricing Plans (with all new tools listed)
- Free: 3 AI searches/day, basic personalization, explore categories, limited community, basic ideas, 1 credit/referral, 2 free marketplace items
- Pro (₹450): 5 searches/day, promoted profile, monitoring, recommendations, priority support, pro forums, resume upload, weekly reports, 5% affiliate, full marketplace
- Elite (₹900): 10 searches/day, webinars, AI Mentor, elite communities, expert review, free tools, hacks library, 1-on-1 sessions, 6% affiliate, sell 1 course+tool+item
- Infinity (₹2,250): 20 searches/day, create/sell courses(5), sell tools(5), 5 marketplace items, infinity lounge, revenue sharing, priority coaching, custom branding, 10% affiliate, API access
- **Pay-As-You-Go**: ₹10/search wallet credits, all tools unlocked per search

## Phase 2: Plan Comparison & Features Page

### 6. `/plans` Full Comparison Page
- Detailed feature grid showing ALL tools (AI Search, HustleBot, Lead Finder, Skill Gap, Proposal Draft, Roadmap, Knowledge Hub, AI Benchmarks, etc.)
- Pain points section: "Others don't offer this much", "Stop wasting hours on YouTube"
- Resell pages value proposition
- Compare with competitors

## Phase 3: Admin Enhancements

### 7. Admin Panel Additions
- Payment logs dashboard (who initiated, amount, status, timestamps)
- Bonus kit manager (add promotional links/ads per plan)
- Social media links manager (Instagram, YouTube, Twitter/X, LinkedIn, Facebook, Telegram, Discord)
- All social links shown in footer/about page
