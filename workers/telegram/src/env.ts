import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(10, "TELEGRAM_BOT_TOKEN required"),
  SKYMEDIA_BOT_TOKEN: z.string().min(10).optional(),
  TELEGRAM_ADMIN_CHAT_IDS: z.string().min(1, "TELEGRAM_ADMIN_CHAT_IDS required"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  PORT: z.coerce.number().int().positive().default(8080),
  WORKER_SHARED_SECRET: z.string().min(16, "WORKER_SHARED_SECRET must be >=16 chars"),
  DEDUPE_WINDOW_MS: z.coerce.number().int().positive().default(30_000),
  NODE_ENV: z.string().default("production"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("[env] invalid configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const ADMIN_CHAT_IDS: string[] = env.TELEGRAM_ADMIN_CHAT_IDS
  .split(/[,;\s]+/)
  .map((s) => s.trim())
  .filter(Boolean);