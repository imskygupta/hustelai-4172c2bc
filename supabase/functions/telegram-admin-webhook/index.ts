// Alias function for telegram-admin-webhook → reuses the SkyMedia admin bot
// webhook handler. The Telegram webhook was registered at this path; this
// file ensures the endpoint exists and routes to the same Deno.serve handler.
import "../skymedia-webhook/index.ts";