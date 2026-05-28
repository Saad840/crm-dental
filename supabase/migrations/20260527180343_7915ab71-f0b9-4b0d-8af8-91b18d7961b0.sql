
-- Enums
CREATE TYPE public.clinic_status AS ENUM ('New','Researching','Contacted','In Discussion','Closed-Won');
CREATE TYPE public.social_platform AS ENUM ('Instagram','Facebook','Twitter','YouTube','LinkedIn');

-- Clinics
CREATE TABLE public.clinics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_name TEXT NOT NULL,
  website_url TEXT,
  phone_primary TEXT,
  phone_secondary TEXT,
  email_primary TEXT,
  email_secondary TEXT,
  street TEXT,
  city TEXT,
  state TEXT,
  google_map_url TEXT,
  google_reviews_count INTEGER,
  google_rating NUMERIC(3,2),
  categories TEXT,
  additional_info TEXT,
  status public.clinic_status NOT NULL DEFAULT 'New',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, clinic_name)
);
CREATE INDEX clinics_user_idx ON public.clinics(user_id);
CREATE INDEX clinics_status_idx ON public.clinics(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinics TO authenticated;
GRANT ALL ON public.clinics TO service_role;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own clinics select" ON public.clinics FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own clinics insert" ON public.clinics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own clinics update" ON public.clinics FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own clinics delete" ON public.clinics FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Staff
CREATE TABLE public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  linkedin_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX staff_clinic_idx ON public.staff(clinic_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own staff all" ON public.staff FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = staff.clinic_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = staff.clinic_id AND c.user_id = auth.uid()));

-- Socials
CREATE TABLE public.socials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  platform public.social_platform NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX socials_clinic_idx ON public.socials(clinic_id);
CREATE INDEX socials_staff_idx ON public.socials(staff_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.socials TO authenticated;
GRANT ALL ON public.socials TO service_role;
ALTER TABLE public.socials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own socials all" ON public.socials FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = socials.clinic_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = socials.clinic_id AND c.user_id = auth.uid()));

-- Outreach
CREATE TABLE public.outreach_timeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  notes TEXT,
  outcome TEXT,
  date_logged TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX outreach_clinic_idx ON public.outreach_timeline(clinic_id);
CREATE INDEX outreach_date_idx ON public.outreach_timeline(date_logged DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_timeline TO authenticated;
GRANT ALL ON public.outreach_timeline TO service_role;
ALTER TABLE public.outreach_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own outreach all" ON public.outreach_timeline FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = outreach_timeline.clinic_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = outreach_timeline.clinic_id AND c.user_id = auth.uid()));

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER clinics_touch BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER staff_touch BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
