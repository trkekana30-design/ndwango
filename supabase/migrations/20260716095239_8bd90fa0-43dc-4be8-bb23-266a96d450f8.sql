
CREATE TABLE public.business_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('owner','seller')),
  role text NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX business_chat_messages_user_scope_created_idx
  ON public.business_chat_messages (user_id, scope, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_chat_messages TO authenticated;
GRANT ALL ON public.business_chat_messages TO service_role;

ALTER TABLE public.business_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own business AI messages"
  ON public.business_chat_messages
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
