-- Kill all newsletter/broadcast cron jobs
SELECT cron.unschedule('brevo-newsletter-hourly');
SELECT cron.unschedule('newsletter-weekly-draft');
SELECT cron.unschedule('abandoned-checkout-recovery-hourly');