-- Chat messages for the AI receptionist (one conversation per user)
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_user_created_idx ON public.chat_messages(user_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own messages" ON public.chat_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own messages" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own messages" ON public.chat_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Leads: buyer interest captured by the AI receptionist for sellers
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  interest TEXT NOT NULL,
  budget_cents INTEGER,
  ai_summary TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','won','lost')),
  source TEXT NOT NULL DEFAULT 'ai_receptionist',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX leads_shop_idx ON public.leads(shop_id, created_at DESC);
CREATE INDEX leads_buyer_idx ON public.leads(buyer_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can create leads" ON public.leads
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Shop owner reads their leads" ON public.leads
  FOR SELECT TO authenticated USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    OR buyer_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Shop owner updates their leads" ON public.leads
  FOR UPDATE TO authenticated USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  ) WITH CHECK (
    shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();