
CREATE TABLE IF NOT EXISTS public.workspace_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  doc_type text NOT NULL CHECK (doc_type IN ('quotation','agreement','invoice','service_card','business_card')),
  title text NOT NULL DEFAULT 'Untitled',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme text NOT NULL DEFAULT 'minimal-dark',
  status text NOT NULL DEFAULT 'draft',
  doc_number text,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_documents_owner ON public.workspace_documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_documents_workspace ON public.workspace_documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_documents_type ON public.workspace_documents(doc_type);

ALTER TABLE public.workspace_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own documents"
  ON public.workspace_documents
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admins manage all documents"
  ON public.workspace_documents
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_workspace_documents_updated_at
  BEFORE UPDATE ON public.workspace_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
