
-- Shops: seller contact
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS id_number text;

-- Delivery zones
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  areas text,
  fee_cents integer NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
  eta_days integer NOT NULL DEFAULT 3 CHECK (eta_days >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.delivery_zones TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_zones TO authenticated;
GRANT ALL ON public.delivery_zones TO service_role;

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active zones are viewable by everyone"
  ON public.delivery_zones FOR SELECT USING (is_active OR EXISTS (
    SELECT 1 FROM public.shops s WHERE s.id = delivery_zones.shop_id AND s.owner_id = auth.uid()
  ));

CREATE POLICY "Shop owner manages zones - insert"
  ON public.delivery_zones FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = delivery_zones.shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "Shop owner manages zones - update"
  ON public.delivery_zones FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = delivery_zones.shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = delivery_zones.shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "Shop owner manages zones - delete"
  ON public.delivery_zones FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = delivery_zones.shop_id AND s.owner_id = auth.uid()));

CREATE TRIGGER delivery_zones_updated_at BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS delivery_zones_shop_idx ON public.delivery_zones(shop_id);

-- Orders: delivery info
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_zone_id uuid REFERENCES public.delivery_zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_province text;

-- Leads: support tickets
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'inquiry',
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subject text;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_type_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_type_check CHECK (type IN ('inquiry','support'));
