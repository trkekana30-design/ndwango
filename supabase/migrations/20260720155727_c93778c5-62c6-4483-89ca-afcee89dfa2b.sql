CREATE TABLE public.agent_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('owner','seller')),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  period_days INT NOT NULL DEFAULT 7,
  title TEXT NOT NULL,
  summary_md TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX agent_reports_user_created_idx ON public.agent_reports (user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.agent_reports TO authenticated;
GRANT ALL ON public.agent_reports TO service_role;

ALTER TABLE public.agent_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own reports"
  ON public.agent_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own reports"
  ON public.agent_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own reports"
  ON public.agent_reports FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);