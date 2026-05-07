
-- 1. BRAND KITS (one per user)
CREATE TABLE IF NOT EXISTS public.brand_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  business_name text,
  tagline text,
  logo_url text,
  signature_url text,
  stamp_url text,
  brand_color text DEFAULT '#0a0a0a',
  accent_color text DEFAULT '#1d4ed8',
  footer_text text,
  website text,
  email text,
  phone text,
  address text,
  tax_label text,
  tax_id text,
  default_currency text DEFAULT 'INR',
  default_theme text DEFAULT 'minimal-dark',
  default_payment_terms text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own brand kit" ON public.brand_kits
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_brand_kits_updated_at
  BEFORE UPDATE ON public.brand_kits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. REUSABLE BLOCKS (snippets)
CREATE TABLE IF NOT EXISTS public.doc_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('payment_terms','revisions','scope','onboarding','cancellation','delivery','ip','custom')),
  title text NOT NULL,
  body text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_blocks_user ON public.doc_blocks(user_id, kind);

ALTER TABLE public.doc_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own blocks" ON public.doc_blocks
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_doc_blocks_updated_at
  BEFORE UPDATE ON public.doc_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. CLIENT PROFILES
CREATE TABLE IF NOT EXISTS public.client_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  company text,
  email text,
  phone text,
  address text,
  timezone text,
  currency text DEFAULT 'INR',
  notes text,
  default_payment_terms text,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_profiles_user ON public.client_profiles(user_id);

ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own clients" ON public.client_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_client_profiles_updated_at
  BEFORE UPDATE ON public.client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. EXTEND workspace_documents
ALTER TABLE public.workspace_documents
  ADD COLUMN IF NOT EXISTS client_profile_id uuid REFERENCES public.client_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_doc_id uuid REFERENCES public.workspace_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Allow new doc types + statuses
ALTER TABLE public.workspace_documents DROP CONSTRAINT IF EXISTS workspace_documents_doc_type_check;
ALTER TABLE public.workspace_documents
  ADD CONSTRAINT workspace_documents_doc_type_check
  CHECK (doc_type IN ('quotation','agreement','invoice','proposal','service_card','business_card'));

ALTER TABLE public.workspace_documents DROP CONSTRAINT IF EXISTS workspace_documents_status_check;
ALTER TABLE public.workspace_documents
  ADD CONSTRAINT workspace_documents_status_check
  CHECK (status IN ('draft','sent','viewed','approved','paid','void'));

CREATE INDEX IF NOT EXISTS idx_workspace_documents_parent ON public.workspace_documents(parent_doc_id);
CREATE INDEX IF NOT EXISTS idx_workspace_documents_client_profile ON public.workspace_documents(client_profile_id);

-- 5. BRAND ASSETS bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Brand assets are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets');

CREATE POLICY "Users upload to own brand folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own brand assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own brand assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'brand-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
