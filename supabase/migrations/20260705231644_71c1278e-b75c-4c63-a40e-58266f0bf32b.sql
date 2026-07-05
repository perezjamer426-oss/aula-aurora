
-- Enum de roles y tipos de institución
CREATE TYPE public.app_role AS ENUM ('director', 'teacher', 'student');
CREATE TYPE public.institution_type AS ENUM ('preescolar', 'primaria', 'secundaria', 'preparatoria', 'universidad', 'otro');

-- ================= INSTITUTIONS =================
CREATE TABLE public.institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 40),
  address text CHECK (address IS NULL OR char_length(address) <= 240),
  country text CHECK (country IS NULL OR char_length(country) <= 80),
  type public.institution_type NOT NULL DEFAULT 'otro',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.institutions TO authenticated;
GRANT ALL ON public.institutions TO service_role;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- ================= PROFILES =================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 120),
  email text NOT NULL,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ================= USER_ROLES =================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, institution_id)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ================= SECURITY DEFINER: has_role =================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- ================= updated_at trigger =================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_institutions_updated_at BEFORE UPDATE ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ================= RLS: PROFILES =================
CREATE POLICY "profiles_select_self"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No INSERT policy: only the security-definer function inserts profiles.

-- ================= RLS: INSTITUTIONS =================
CREATE POLICY "institutions_select_member"
  ON public.institutions FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "institutions_update_director"
  ON public.institutions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'director'))
  WITH CHECK (public.has_role(auth.uid(), 'director'));

-- No INSERT/DELETE policy: only the security-definer function inserts institutions.

-- ================= RLS: USER_ROLES =================
CREATE POLICY "user_roles_select_self"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies: managed by security-definer functions only.

-- ================= REGISTER DIRECTOR + INSTITUTION =================
CREATE OR REPLACE FUNCTION public.register_director_institution(
  _full_name text,
  _institution_name text,
  _institution_phone text,
  _institution_address text,
  _institution_country text,
  _institution_type public.institution_type
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _email text;
  _institution_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RAISE EXCEPTION 'La cuenta ya tiene una institución registrada' USING ERRCODE = '23505';
  END IF;

  IF _full_name IS NULL OR char_length(trim(_full_name)) = 0 THEN
    RAISE EXCEPTION 'El nombre del director es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF _institution_name IS NULL OR char_length(trim(_institution_name)) = 0 THEN
    RAISE EXCEPTION 'El nombre de la institución es obligatorio' USING ERRCODE = '22023';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _user_id;

  INSERT INTO public.institutions (name, phone, address, country, type, created_by)
  VALUES (
    trim(_institution_name),
    NULLIF(trim(coalesce(_institution_phone, '')), ''),
    NULLIF(trim(coalesce(_institution_address, '')), ''),
    NULLIF(trim(coalesce(_institution_country, '')), ''),
    _institution_type,
    _user_id
  )
  RETURNING id INTO _institution_id;

  INSERT INTO public.profiles (id, full_name, email, institution_id)
  VALUES (_user_id, trim(_full_name), _email, _institution_id);

  INSERT INTO public.user_roles (user_id, role, institution_id)
  VALUES (_user_id, 'director', _institution_id);

  RETURN _institution_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_director_institution(text, text, text, text, text, public.institution_type) TO authenticated;
