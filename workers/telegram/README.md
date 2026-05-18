# HustleAI Telegram Worker

Standalone Express + TypeScript worker that handles Telegram alert delivery
independently of Lovable Cloud edge functions. Designed for Railway.

## Replaces
- `admin-alert` (Telegram fan-out portion)
- `ops-daily-digest` (Telegram delivery portion)
- Anomaly Telegram dispatch from `intelligence-anomaly-scan`

The worker still writes alert rows to Supabase (`admin_alerts`) using the
service role key, so admin dashboards continue to work.

## Endpoints
- `GET  /health`        — liveness + bot reachability
- `POST /send-alert`    — enqueue + deliver alert (auth: `X-Worker-Secret`)

## Deploy (Railway)
1. Create new Railway service → Deploy from repo subdirectory `workers/telegram`.
2. Set env vars from `.env.example`.
3. Healthcheck path: `/health`.
4. Update edge functions / cron jobs to POST to `https://<service>.up.railway.app/send-alert`
   with header `X-Worker-Secret: $WORKER_SHARED_SECRET`.

## Local
```
cp .env.example .env
npm install
npm run dev
```