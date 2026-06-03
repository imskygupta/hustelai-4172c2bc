
-- ============ pdf_studio_documents ============
CREATE TABLE public.pdf_studio_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_profile_id uuid REFERENCES public.client_profiles(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Untitled document',
  doc_kind text NOT NULL DEFAULT 'pdf',
  source_storage_path text,
  source_size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pdf_studio_documents_user ON public.pdf_studio_documents(user_id);
CREATE INDEX idx_pdf_studio_documents_client ON public.pdf_studio_documents(client_profile_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_studio_documents TO authenticated;
GRANT ALL ON public.pdf_studio_documents TO service_role;
ALTER TABLE public.pdf_studio_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage pdf docs" ON public.pdf_studio_documents
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ pdf_studio_revisions ============
CREATE TABLE public.pdf_studio_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.pdf_studio_documents(id) ON DELETE CASCADE,
  version int NOT NULL,
  blocks_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_instruction text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, version)
);
CREATE INDEX idx_pdf_studio_revisions_doc ON public.pdf_studio_revisions(document_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_studio_revisions TO authenticated;
GRANT ALL ON public.pdf_studio_revisions TO service_role;
ALTER TABLE public.pdf_studio_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage pdf revisions" ON public.pdf_studio_revisions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pdf_studio_documents d
                 WHERE d.id = document_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pdf_studio_documents d
                      WHERE d.id = document_id AND d.user_id = auth.uid()));

-- ============ pdf_studio_share_links ============
CREATE TABLE public.pdf_studio_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL UNIQUE REFERENCES public.pdf_studio_documents(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pdf_studio_share_slug ON public.pdf_studio_share_links(slug);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_studio_share_links TO authenticated;
GRANT ALL ON public.pdf_studio_share_links TO service_role;
ALTER TABLE public.pdf_studio_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage pdf shares" ON public.pdf_studio_share_links
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pdf_studio_documents d
                 WHERE d.id = document_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pdf_studio_documents d
                      WHERE d.id = document_id AND d.user_id = auth.uid()));

-- ============ pdf_studio_annotations ============
CREATE TABLE public.pdf_studio_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES public.pdf_studio_revisions(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.pdf_studio_documents(id) ON DELETE CASCADE,
  anchor_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  comment text NOT NULL,
  client_name text,
  client_email text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pdf_studio_annotations_doc ON public.pdf_studio_annotations(document_id);
CREATE INDEX idx_pdf_studio_annotations_rev ON public.pdf_studio_annotations(revision_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_studio_annotations TO authenticated;
GRANT ALL ON public.pdf_studio_annotations TO service_role;
ALTER TABLE public.pdf_studio_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners read annotations" ON public.pdf_studio_annotations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pdf_studio_documents d
                 WHERE d.id = document_id AND d.user_id = auth.uid()));

CREATE POLICY "owners update annotations" ON public.pdf_studio_annotations
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pdf_studio_documents d
                 WHERE d.id = document_id AND d.user_id = auth.uid()));

CREATE POLICY "owners delete annotations" ON public.pdf_studio_annotations
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pdf_studio_documents d
                 WHERE d.id = document_id AND d.user_id = auth.uid()));

-- ============ Public resolver RPCs (security definer) ============
CREATE OR REPLACE FUNCTION public.pdf_studio_resolve_share(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_doc public.pdf_studio_documents%ROWTYPE;
  v_rev public.pdf_studio_revisions%ROWTYPE;
  v_link public.pdf_studio_share_links%ROWTYPE;
BEGIN
  SELECT * INTO v_link FROM public.pdf_studio_share_links
   WHERE slug = p_slug AND is_active = true
     AND (expires_at IS NULL OR expires_at > now())
   LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_doc FROM public.pdf_studio_documents WHERE id = v_link.document_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_rev FROM public.pdf_studio_revisions
   WHERE document_id = v_doc.id
   ORDER BY version DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'document_id', v_doc.id,
    'title', v_doc.title,
    'revision_id', v_rev.id,
    'version', v_rev.version,
    'blocks', v_rev.blocks_json,
    'created_at', v_rev.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.pdf_studio_resolve_share(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.pdf_studio_insert_annotation(
  p_slug text, p_anchor jsonb, p_comment text,
  p_client_name text, p_client_email text
) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_link public.pdf_studio_share_links%ROWTYPE;
  v_rev public.pdf_studio_revisions%ROWTYPE;
  v_id uuid;
BEGIN
  IF p_comment IS NULL OR length(trim(p_comment)) = 0 THEN
    RAISE EXCEPTION 'comment required';
  END IF;
  IF length(p_comment) > 2000 THEN
    RAISE EXCEPTION 'comment too long';
  END IF;

  SELECT * INTO v_link FROM public.pdf_studio_share_links
   WHERE slug = p_slug AND is_active = true
     AND (expires_at IS NULL OR expires_at > now())
   LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid link'; END IF;

  SELECT * INTO v_rev FROM public.pdf_studio_revisions
   WHERE document_id = v_link.document_id
   ORDER BY version DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'no revision'; END IF;

  INSERT INTO public.pdf_studio_annotations
    (revision_id, document_id, anchor_json, comment, client_name, client_email)
  VALUES
    (v_rev.id, v_link.document_id, COALESCE(p_anchor, '{}'::jsonb),
     p_comment, NULLIF(p_client_name,''), NULLIF(p_client_email,''))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pdf_studio_insert_annotation(text, jsonb, text, text, text)
  TO anon, authenticated;

-- updated_at trigger for documents
CREATE TRIGGER trg_pdf_studio_documents_updated_at
  BEFORE UPDATE ON public.pdf_studio_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
