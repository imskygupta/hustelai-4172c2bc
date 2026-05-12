CREATE TABLE IF NOT EXISTS public.indexnow_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'blog_post',
  source_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_indexnow_queue_status ON public.indexnow_queue(status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_indexnow_queue_url_pending
  ON public.indexnow_queue(url) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.indexnow_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engine TEXT NOT NULL,
  url_count INT NOT NULL DEFAULT 0,
  ok BOOLEAN NOT NULL DEFAULT false,
  status_code INT,
  error TEXT,
  sample_urls JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_indexnow_log_created ON public.indexnow_log(created_at DESC);

ALTER TABLE public.indexnow_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indexnow_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "indexnow_queue admin all" ON public.indexnow_queue
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "indexnow_log admin all" ON public.indexnow_log
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));