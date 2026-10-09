CREATE TABLE public.agent_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agent_name text NOT NULL, action text NOT NULL, status text NOT NULL DEFAULT 'info', details jsonb, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.agent_logs TO authenticated; GRANT ALL ON public.agent_logs TO service_role;
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read agent logs" ON public.agent_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.agent_status (agent_name text PRIMARY KEY, status text NOT NULL DEFAULT 'green', issues jsonb NOT NULL DEFAULT '[]', actions jsonb NOT NULL DEFAULT '[]', metrics jsonb NOT NULL DEFAULT '{}', last_check timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.agent_status TO authenticated; GRANT ALL ON public.agent_status TO service_role;
ALTER TABLE public.agent_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read agent status" ON public.agent_status FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.moderation_queue (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subject_type text NOT NULL, subject_id uuid, dedupe_key text UNIQUE, reason text NOT NULL, risk text NOT NULL DEFAULT 'low', evidence jsonb, status text NOT NULL DEFAULT 'open', appeal text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, UPDATE ON public.moderation_queue TO authenticated; GRANT ALL ON public.moderation_queue TO service_role;
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read flags" ON public.moderation_queue FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update flags" ON public.moderation_queue FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER moderation_queue_updated_at BEFORE UPDATE ON public.moderation_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.expenses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), label text NOT NULL, category text NOT NULL DEFAULT 'operating', amount_cents integer NOT NULL, spent_on date NOT NULL DEFAULT current_date, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, DELETE ON public.expenses TO authenticated; GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage expenses" ON public.expenses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.hq_job (id int PRIMARY KEY DEFAULT 1, cron_token text NOT NULL DEFAULT encode(gen_random_bytes(24),'hex'), locked_until timestamptz, last_run timestamptz, CHECK (id = 1));
GRANT ALL ON public.hq_job TO service_role;
ALTER TABLE public.hq_job ENABLE ROW LEVEL SECURITY;
INSERT INTO public.hq_job (id) VALUES (1);