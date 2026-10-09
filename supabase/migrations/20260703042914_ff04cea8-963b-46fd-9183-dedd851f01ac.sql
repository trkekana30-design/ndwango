DROP POLICY IF EXISTS "Authenticated can create leads" ON public.leads;
CREATE POLICY "Users create own leads" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());