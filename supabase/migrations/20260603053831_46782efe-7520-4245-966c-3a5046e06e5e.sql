UPDATE public.pdf_studio_documents SET doc_kind = 'upload'
  WHERE doc_kind IS NULL OR doc_kind NOT IN ('upload','proposal','contract','nda','invoice','quotation');

ALTER TABLE public.pdf_studio_documents
  ADD COLUMN IF NOT EXISTS brand_applied boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

ALTER TABLE public.pdf_studio_documents ALTER COLUMN doc_kind SET DEFAULT 'upload';
ALTER TABLE public.pdf_studio_documents ALTER COLUMN doc_kind SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.pdf_studio_documents
    ADD CONSTRAINT pdf_studio_documents_doc_kind_check
    CHECK (doc_kind IN ('upload','proposal','contract','nda','invoice','quotation'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.pdf_studio_documents
    ADD CONSTRAINT pdf_studio_documents_status_check
    CHECK (status IN ('draft','shared','viewed','approved','revision_requested'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.pdf_studio_revisions
  ADD COLUMN IF NOT EXISTS overlays_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS background_pdf_path text,
  ADD COLUMN IF NOT EXISTS brand_snapshot jsonb;

ALTER TABLE public.pdf_studio_annotations
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'comment';

DO $$ BEGIN
  ALTER TABLE public.pdf_studio_annotations
    ADD CONSTRAINT pdf_studio_annotations_kind_check
    CHECK (kind IN ('comment','change_request','approval'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP FUNCTION IF EXISTS public.pdf_studio_resolve_share(text);
DROP FUNCTION IF EXISTS public.pdf_studio_insert_annotation(text, jsonb, text, text, text);

CREATE OR REPLACE FUNCTION public.pdf_studio_resolve_share(p_slug text)
RETURNS TABLE (
  document_id uuid,
  title text,
  doc_kind text,
  status text,
  revision_id uuid,
  version int,
  blocks jsonb,
  overlays jsonb,
  background_pdf_path text,
  brand_snapshot jsonb,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.id, d.title, d.doc_kind, d.status,
         r.id, r.version, r.blocks_json, r.overlays_json,
         r.background_pdf_path, r.brand_snapshot, r.created_at
  FROM public.pdf_studio_share_links l
  JOIN public.pdf_studio_documents d ON d.id = l.document_id
  JOIN LATERAL (
    SELECT * FROM public.pdf_studio_revisions
    WHERE document_id = d.id ORDER BY version DESC LIMIT 1
  ) r ON true
  WHERE l.slug = p_slug AND l.is_active = true
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.pdf_studio_resolve_share(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.pdf_studio_insert_annotation(
  p_slug text, p_anchor jsonb, p_comment text,
  p_client_name text, p_client_email text, p_kind text DEFAULT 'comment'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_doc uuid; v_rev uuid; v_id uuid; v_kind text := COALESCE(p_kind,'comment');
BEGIN
  IF v_kind NOT IN ('comment','change_request','approval') THEN v_kind := 'comment'; END IF;
  SELECT d.id, r.id INTO v_doc, v_rev
  FROM public.pdf_studio_share_links l
  JOIN public.pdf_studio_documents d ON d.id = l.document_id
  JOIN LATERAL (
    SELECT id FROM public.pdf_studio_revisions
    WHERE document_id = d.id ORDER BY version DESC LIMIT 1
  ) r ON true
  WHERE l.slug = p_slug AND l.is_active = true LIMIT 1;
  IF v_doc IS NULL THEN RAISE EXCEPTION 'invalid share link'; END IF;
  INSERT INTO public.pdf_studio_annotations
    (revision_id, document_id, anchor_json, comment, client_name, client_email, kind, status)
  VALUES (v_rev, v_doc, COALESCE(p_anchor,'{}'::jsonb), LEFT(COALESCE(p_comment,''),4000),
          NULLIF(p_client_name,''), NULLIF(p_client_email,''), v_kind, 'open')
  RETURNING id INTO v_id;
  IF v_kind = 'approval' THEN
    UPDATE public.pdf_studio_documents SET status='approved' WHERE id = v_doc;
  ELSIF v_kind = 'change_request' THEN
    UPDATE public.pdf_studio_documents SET status='revision_requested' WHERE id = v_doc;
  END IF;
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.pdf_studio_insert_annotation(text, jsonb, text, text, text, text) TO anon, authenticated;