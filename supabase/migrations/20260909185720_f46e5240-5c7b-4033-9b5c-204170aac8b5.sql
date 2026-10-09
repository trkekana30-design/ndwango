-- Orders: payment + tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS courier text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, buyer_id)
);

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone"
  ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Buyers write reviews for products they bought"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    buyer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.product_id = reviews.product_id AND o.buyer_id = auth.uid()
    )
  );

CREATE POLICY "Buyers update own reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid()) WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Buyers delete own reviews"
  ON public.reviews FOR DELETE TO authenticated
  USING (buyer_id = auth.uid());

CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Order timeline
CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View order events via order access"
  ON public.order_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_events.order_id
      AND (o.buyer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.shops s WHERE s.id = o.shop_id AND s.owner_id = auth.uid()))
  ));

CREATE POLICY "Insert order events via order access"
  ON public.order_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_events.order_id
      AND (o.buyer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.shops s WHERE s.id = o.shop_id AND s.owner_id = auth.uid()))
  ));

-- Auto-log status changes
CREATE OR REPLACE FUNCTION public.log_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_events (order_id, status, note)
    VALUES (NEW.id, NEW.status::text, 'Order placed');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_events (order_id, status, note)
    VALUES (NEW.id, NEW.status::text, NULL);
    IF NEW.status = 'delivered' AND NEW.delivered_at IS NULL THEN
      NEW.delivered_at = now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_log_status_ins ON public.orders;
CREATE TRIGGER orders_log_status_ins AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status();

DROP TRIGGER IF EXISTS orders_log_status_upd ON public.orders;
CREATE TRIGGER orders_log_status_upd BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status();