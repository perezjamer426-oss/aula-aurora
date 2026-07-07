
-- ============================================================================
-- Fase A — Módulo docentes
-- ============================================================================

-- 1) Enum de estado del docente
CREATE TYPE public.teacher_status AS ENUM ('pendiente', 'activo', 'inactivo');

-- Añadir 'teacher' al enum app_role si no existe (ya existe según types.ts)
-- No hace falta ALTER TYPE.

-- 2) Tabla teachers
CREATE TABLE public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  photo_url text,
  subjects text[] NOT NULL DEFAULT '{}',
  status public.teacher_status NOT NULL DEFAULT 'pendiente',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY teachers_select_same_institution ON public.teachers
  FOR SELECT TO authenticated
  USING (institution_id = public.current_user_institution());

CREATE POLICY teachers_insert_director ON public.teachers
  FOR INSERT TO authenticated
  WITH CHECK (
    institution_id = public.current_user_institution()
    AND public.has_role(auth.uid(), 'director')
    AND created_by = auth.uid()
  );

CREATE POLICY teachers_update_director ON public.teachers
  FOR UPDATE TO authenticated
  USING (
    institution_id = public.current_user_institution()
    AND public.has_role(auth.uid(), 'director')
  )
  WITH CHECK (
    institution_id = public.current_user_institution()
    AND public.has_role(auth.uid(), 'director')
  );

CREATE POLICY teachers_delete_director ON public.teachers
  FOR DELETE TO authenticated
  USING (
    institution_id = public.current_user_institution()
    AND public.has_role(auth.uid(), 'director')
  );

CREATE TRIGGER teachers_set_updated_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Tabla teacher_invitations
CREATE TABLE public.teacher_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX teacher_invitations_code_idx ON public.teacher_invitations(code);
CREATE INDEX teacher_invitations_teacher_idx ON public.teacher_invitations(teacher_id);

GRANT SELECT, INSERT, UPDATE ON public.teacher_invitations TO authenticated;
GRANT ALL ON public.teacher_invitations TO service_role;

ALTER TABLE public.teacher_invitations ENABLE ROW LEVEL SECURITY;

-- Director de la institución puede ver los códigos
CREATE POLICY teacher_invitations_select_director ON public.teacher_invitations
  FOR SELECT TO authenticated
  USING (
    institution_id = public.current_user_institution()
    AND public.has_role(auth.uid(), 'director')
  );

CREATE POLICY teacher_invitations_insert_director ON public.teacher_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    institution_id = public.current_user_institution()
    AND public.has_role(auth.uid(), 'director')
    AND created_by = auth.uid()
  );

-- 4) Generador de código único AUR-XXXXX-XXXXX
CREATE OR REPLACE FUNCTION public.generate_teacher_invitation_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  _numeric text := '0123456789';
  _code text;
  _part1 text;
  _part2 text;
  _i int;
  _attempts int := 0;
BEGIN
  LOOP
    _part1 := '';
    FOR _i IN 1..5 LOOP
      _part1 := _part1 || substr(_numeric, 1 + floor(random() * length(_numeric))::int, 1);
    END LOOP;

    _part2 := '';
    FOR _i IN 1..5 LOOP
      _part2 := _part2 || substr(_chars, 1 + floor(random() * length(_chars))::int, 1);
    END LOOP;

    _code := 'AUR-' || _part1 || '-' || _part2;

    IF NOT EXISTS (SELECT 1 FROM public.teacher_invitations WHERE code = _code) THEN
      RETURN _code;
    END IF;

    _attempts := _attempts + 1;
    IF _attempts > 25 THEN
      RAISE EXCEPTION 'No se pudo generar un código único';
    END IF;
  END LOOP;
END;
$$;

-- 5) Crear docente + invitación en una transacción
CREATE OR REPLACE FUNCTION public.create_teacher_with_invitation(
  _full_name text,
  _email text,
  _phone text,
  _subjects text[]
)
RETURNS TABLE (teacher_id uuid, invitation_code text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _institution_id uuid;
  _teacher_id uuid;
  _code text;
  _expires timestamptz := now() + interval '7 days';
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_role(_user_id, 'director') THEN
    RAISE EXCEPTION 'Sólo un director puede crear docentes' USING ERRCODE = '42501';
  END IF;

  SELECT institution_id INTO _institution_id
  FROM public.profiles WHERE id = _user_id;

  IF _institution_id IS NULL THEN
    RAISE EXCEPTION 'El director no tiene institución asignada' USING ERRCODE = '22023';
  END IF;

  IF _full_name IS NULL OR char_length(trim(_full_name)) = 0 THEN
    RAISE EXCEPTION 'El nombre del docente es obligatorio' USING ERRCODE = '22023';
  END IF;
  IF _email IS NULL OR char_length(trim(_email)) = 0 THEN
    RAISE EXCEPTION 'El correo del docente es obligatorio' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.teachers (
    institution_id, full_name, email, phone, subjects, status, created_by
  ) VALUES (
    _institution_id,
    trim(_full_name),
    lower(trim(_email)),
    NULLIF(trim(coalesce(_phone, '')), ''),
    coalesce(_subjects, '{}'),
    'pendiente',
    _user_id
  )
  RETURNING id INTO _teacher_id;

  _code := public.generate_teacher_invitation_code();

  INSERT INTO public.teacher_invitations (
    teacher_id, institution_id, code, expires_at, created_by
  ) VALUES (
    _teacher_id, _institution_id, _code, _expires, _user_id
  );

  RETURN QUERY SELECT _teacher_id, _code, _expires;
END;
$$;

-- 6) Regenerar invitación (si expiró o el director quiere un código nuevo)
CREATE OR REPLACE FUNCTION public.regenerate_teacher_invitation(_teacher_id uuid)
RETURNS TABLE (invitation_code text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _institution_id uuid;
  _teacher_institution uuid;
  _code text;
  _expires timestamptz := now() + interval '7 days';
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(_user_id, 'director') THEN
    RAISE EXCEPTION 'Sólo un director puede regenerar invitaciones' USING ERRCODE = '42501';
  END IF;

  SELECT institution_id INTO _institution_id
  FROM public.profiles WHERE id = _user_id;

  SELECT institution_id INTO _teacher_institution
  FROM public.teachers WHERE id = _teacher_id;

  IF _teacher_institution IS NULL OR _teacher_institution <> _institution_id THEN
    RAISE EXCEPTION 'Docente no pertenece a tu institución' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.teachers WHERE id = _teacher_id AND user_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Este docente ya aceptó su invitación' USING ERRCODE = '22023';
  END IF;

  _code := public.generate_teacher_invitation_code();

  INSERT INTO public.teacher_invitations (
    teacher_id, institution_id, code, expires_at, created_by
  ) VALUES (
    _teacher_id, _institution_id, _code, _expires, _user_id
  );

  RETURN QUERY SELECT _code, _expires;
END;
$$;

-- 7) Vista previa del código (para el docente antes de registrarse)
--    Retorna información limitada; callable por anon.
CREATE OR REPLACE FUNCTION public.preview_teacher_invitation(_code text)
RETURNS TABLE (
  status text,
  institution_name text,
  teacher_name text,
  expires_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv record;
BEGIN
  SELECT ti.*, i.name AS inst_name, t.full_name AS t_name, t.user_id AS t_user
  INTO _inv
  FROM public.teacher_invitations ti
  JOIN public.institutions i ON i.id = ti.institution_id
  JOIN public.teachers t ON t.id = ti.teacher_id
  WHERE ti.code = upper(trim(_code))
  ORDER BY ti.created_at DESC
  LIMIT 1;

  IF _inv IS NULL THEN
    RETURN QUERY SELECT 'invalid'::text, NULL::text, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  IF _inv.used_at IS NOT NULL OR _inv.t_user IS NOT NULL THEN
    RETURN QUERY SELECT 'used'::text, _inv.inst_name, _inv.t_name, _inv.expires_at;
    RETURN;
  END IF;

  IF _inv.expires_at < now() THEN
    RETURN QUERY SELECT 'expired'::text, _inv.inst_name, _inv.t_name, _inv.expires_at;
    RETURN;
  END IF;

  RETURN QUERY SELECT 'valid'::text, _inv.inst_name, _inv.t_name, _inv.expires_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_teacher_invitation(text) TO anon, authenticated;

-- 8) Canjear código: crea profile + role + vincula docente + consume invitación
CREATE OR REPLACE FUNCTION public.redeem_teacher_invitation(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _email text;
  _inv record;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para aceptar la invitación' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    RAISE EXCEPTION 'Esta cuenta ya está registrada en una institución' USING ERRCODE = '23505';
  END IF;

  SELECT ti.* INTO _inv
  FROM public.teacher_invitations ti
  WHERE ti.code = upper(trim(_code))
    AND ti.used_at IS NULL
  ORDER BY ti.created_at DESC
  LIMIT 1;

  IF _inv IS NULL THEN
    RAISE EXCEPTION 'Código de invitación no válido o ya utilizado' USING ERRCODE = '22023';
  END IF;

  IF _inv.expires_at < now() THEN
    RAISE EXCEPTION 'Este código de invitación ha expirado' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.teachers WHERE id = _inv.teacher_id AND user_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Este docente ya aceptó una invitación anterior' USING ERRCODE = '23505';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _user_id;

  -- Crear profile
  INSERT INTO public.profiles (id, full_name, email, institution_id)
  SELECT _user_id, t.full_name, _email, t.institution_id
  FROM public.teachers t WHERE t.id = _inv.teacher_id;

  -- Rol teacher
  INSERT INTO public.user_roles (user_id, role, institution_id)
  VALUES (_user_id, 'teacher', _inv.institution_id);

  -- Vincular docente
  UPDATE public.teachers
    SET user_id = _user_id, status = 'activo', updated_at = now()
    WHERE id = _inv.teacher_id;

  -- Consumir invitación
  UPDATE public.teacher_invitations
    SET used_at = now(), used_by = _user_id
    WHERE id = _inv.id;

  RETURN _inv.institution_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_teacher_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_teacher_with_invitation(text, text, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_teacher_invitation(uuid) TO authenticated;
