ALTER TABLE public.outreach_timeline
  ADD COLUMN IF NOT EXISTS target_kind TEXT,
  ADD COLUMN IF NOT EXISTS target_label TEXT,
  ADD COLUMN IF NOT EXISTS contact_detail TEXT;

CREATE TABLE IF NOT EXISTS public.user_outreach_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS user_outreach_types_user_idx ON public.user_outreach_types(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_outreach_types TO authenticated;
GRANT ALL ON public.user_outreach_types TO service_role;

ALTER TABLE public.user_outreach_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own outreach types select"
  ON public.user_outreach_types
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "own outreach types insert"
  ON public.user_outreach_types
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own outreach types update"
  ON public.user_outreach_types
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "own outreach types delete"
  ON public.user_outreach_types
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
