
-- ============= dodo_products =============
CREATE TABLE public.dodo_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL CHECK (mode IN ('test','live')),
  internal_key text NOT NULL,                -- 'pro' | 'elite' | 'infinity' | 'pack_10' ...
  kind text NOT NULL CHECK (kind IN ('subscription','one_time')),
  dodo_product_id text NOT NULL,
  name text NOT NULL,
  amount_inr numeric NOT NULL DEFAULT 0,
  credits int,                               -- only for one_time wallet packs
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mode, internal_key)
);

ALTER TABLE public.dodo_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed can read active dodo products"
  ON public.dodo_products FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins manage dodo products"
  ON public.dodo_products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_dodo_products_updated
  BEFORE UPDATE ON public.dodo_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= dodo_subscriptions =============
CREATE TABLE public.dodo_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mode text NOT NULL CHECK (mode IN ('test','live')),
  dodo_subscription_id text NOT NULL UNIQUE,
  dodo_customer_id text,
  dodo_product_id text,
  internal_key text,                         -- 'pro' | 'elite' | 'infinity'
  status text NOT NULL,                      -- active | on_hold | cancelled | failed | expired
  currency text DEFAULT 'INR',
  amount numeric DEFAULT 0,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  cancelled_at timestamptz,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dodo_sub_user ON public.dodo_subscriptions(user_id);
CREATE INDEX idx_dodo_sub_status ON public.dodo_subscriptions(status);

ALTER TABLE public.dodo_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscriptions"
  ON public.dodo_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage subscriptions"
  ON public.dodo_subscriptions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_dodo_sub_updated
  BEFORE UPDATE ON public.dodo_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= dodo_events (webhook audit log) =============
CREATE TABLE public.dodo_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE,                      -- Dodo event ID for idempotency
  event_type text NOT NULL,
  mode text,
  user_id uuid,
  status text NOT NULL DEFAULT 'received',   -- received | processed | failed | duplicate
  error text,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dodo_events_type ON public.dodo_events(event_type);
CREATE INDEX idx_dodo_events_created ON public.dodo_events(created_at DESC);

ALTER TABLE public.dodo_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read dodo events"
  ON public.dodo_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============= profile fields =============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dodo_customer_id text,
  ADD COLUMN IF NOT EXISTS dodo_subscription_id text;
