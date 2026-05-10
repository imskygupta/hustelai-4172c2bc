export type UnlockMeter = "lightweight" | "export" | "storage";

export interface UnlockBalance {
  meter: UnlockMeter | string;
  feature: string;
  remaining: number;
  lifetime_purchased: number;
  expires_at: string | null;
}

export interface UnlockLedgerEntry {
  meter: string;
  feature: string;
  delta: number;
  balance_after: number;
  reason: "purchase" | "consume" | "grant" | "expire" | "rollover" | "promo" | "referral" | string;
  created_at: string;
  metadata: Record<string, any>;
}

export interface UnlockPack {
  id: string;
  key: string;
  label: string;
  description: string;
  meter: string;
  feature: string;
  units: number;
  price_inr: number;
  validity_hours: number | null;
  active: boolean;
  sort_order: number;
}

export interface UnlockSummary {
  balances: UnlockBalance[];
  recent: UnlockLedgerEntry[];
}