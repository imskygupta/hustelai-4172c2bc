---
name: Usage Intelligence Layer
description: Standardized event tracking, funnel/heatmap analytics, rage detection, anomaly alerts, cost ledger
type: feature
---
**Tables (main DB)**: analytics_events, analytics_event_aggregates, analytics_funnel_steps, capability_cost_ledger, intelligence_alerts, friction_signals.

**Track from client**: `import { track, EVENTS, recordClick, recordRetryFailure } from "@/lib/intelligence"`. Standard event names live in EVENTS — never invent ad-hoc strings. Calls coalesce in 250ms windows.

**Wired emitters**: QuotaBoundary fires `quota_hit` + `unlock_prompt_seen`; UnlockSheet fires `unlock_purchased` on checkout start.

**RPCs (admin-only)**: `analytics_funnel_summary(_funnel_key, _since)`, `analytics_capability_breakdown(_since)`, `intelligence_open_alerts(_limit)`, `ack_intelligence_alert(_id)`. Also `track_event` (callable by anon for landing-page events) and `record_capability_cost` (server-only via service role).

**Anomaly scanner**: `intelligence-anomaly-scan` edge function runs every 5min via pg_cron. Detects unlock spikes, payment-failure surges, AI-job failures, quota attacks, rage clusters. Critical/warning anomalies forwarded to `admin-alert` for Telegram.

**Cron jobs**: `intelligence-anomaly-scan` (*/5), `analytics-rollup` (*/15) populates analytics_event_aggregates.

**Admin UI**: `/admin/mission-control` — dark ops tabs (Funnel, Capability heatmap, Alerts) with KPI strip. Auto-refreshes every 60s.

**Funnel**: monetization steps seeded as tool_opened → quota_hit → unlock_prompt_seen → unlock_purchased → upgrade_clicked. Add new funnels by inserting analytics_funnel_steps rows.

**Cost-per-capability**: `record_capability_cost(user, cap, feat, cost_micro, provider, model, tokens_in, tokens_out, ms)` — call from edge functions after AI/export/job completion. Heatmap surfaces aggregated cost.

**RULE**: Only track operationally useful signals. No vanity metrics.
