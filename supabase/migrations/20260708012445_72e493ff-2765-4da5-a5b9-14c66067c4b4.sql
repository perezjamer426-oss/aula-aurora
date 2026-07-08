
-- =============================================================
-- 1) ENUM: attendance_status
-- =============================================================
CREATE TYPE public.attendance_status AS ENUM ('presente', 'tardanza', 'ausente', 'justificado');

-- =============================================================
-- 2) TABLE: classrooms
-- =============================================================
CREATE TABLE public.classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  grade text NOT NULL,
  section text NOT NULL,
  homeroom_teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, grade, section)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classrooms TO authenticated;
GRANT ALL ON public.classrooms TO service_role;

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classrooms_select_same_institution"
  ON public.classrooms FOR SELECT TO authenticated
  USING (institution_id = public.current_user_institution());

CREATE POLICY "classrooms_director_all"
  ON public.classrooms FOR ALL TO authenticated
  USING (institution_id = public.current_user_institution() AND public.has_role(auth.uid(), 'director'))
  WITH CHECK (institution_id = public.current_user_institution() AND public.has_role(auth.uid(), 'director'));

CREATE TRIGGER classrooms_set_updated_at
  BEFORE UPDATE ON public.classrooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX classrooms_teacher_idx ON public.classrooms(homeroom_teacher_id);

-- =============================================================
-- 3) TABLE: classroom_students (pivot)
-- =============================================================
CREATE TABLE public.classroom_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id) -- un estudiante en un aula a la vez
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_students TO authenticated;
GRANT ALL ON public.classroom_students TO service_role;

ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classroom_students_select_same_institution"
  ON public.classroom_students FOR SELECT TO authenticated
  USING (institution_id = public.current_user_institution());

CREATE POLICY "classroom_students_director_all"
  ON public.classroom_students FOR ALL TO authenticated
  USING (institution_id = public.current_user_institution() AND public.has_role(auth.uid(), 'director'))
  WITH CHECK (institution_id = public.current_user_institution() AND public.has_role(auth.uid(), 'director'));

CREATE INDEX classroom_students_classroom_idx ON public.classroom_students(classroom_id);

-- =============================================================
-- 4) TABLE: attendance_sessions
-- =============================================================
CREATE TABLE public.attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT current_date,
  taken_by uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (classroom_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_sessions TO authenticated;
GRANT ALL ON public.attendance_sessions TO service_role;

ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_sessions_select_same_institution"
  ON public.attendance_sessions FOR SELECT TO authenticated
  USING (institution_id = public.current_user_institution());

-- Escrituras se hacen vía RPC save_attendance; el director también puede via UPDATE directo si lo desea
CREATE POLICY "attendance_sessions_director_all"
  ON public.attendance_sessions FOR ALL TO authenticated
  USING (institution_id = public.current_user_institution() AND public.has_role(auth.uid(), 'director'))
  WITH CHECK (institution_id = public.current_user_institution() AND public.has_role(auth.uid(), 'director'));

CREATE TRIGGER attendance_sessions_set_updated_at
  BEFORE UPDATE ON public.attendance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX attendance_sessions_date_idx ON public.attendance_sessions(institution_id, date DESC);
CREATE INDEX attendance_sessions_classroom_idx ON public.attendance_sessions(classroom_id, date DESC);

-- =============================================================
-- 5) TABLE: attendance_records
-- =============================================================
CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_records_select_same_institution"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.attendance_sessions s
    WHERE s.id = session_id
      AND s.institution_id = public.current_user_institution()
  ));

CREATE POLICY "attendance_records_director_all"
  ON public.attendance_records FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'director')
    AND EXISTS (
      SELECT 1 FROM public.attendance_sessions s
      WHERE s.id = session_id
        AND s.institution_id = public.current_user_institution()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'director')
    AND EXISTS (
      SELECT 1 FROM public.attendance_sessions s
      WHERE s.id = session_id
        AND s.institution_id = public.current_user_institution()
    )
  );

CREATE TRIGGER attendance_records_set_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX attendance_records_student_idx ON public.attendance_records(student_id);

-- =============================================================
-- 6) TABLE: notifications
-- =============================================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  recipient_user_id uuid,           -- NULL = broadcast a la institución
  type text NOT NULL,
  title text NOT NULL,
  body text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Ver mis notificaciones + broadcasts de mi institución
CREATE POLICY "notifications_select_own_or_broadcast"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    institution_id = public.current_user_institution()
    AND (recipient_user_id IS NULL OR recipient_user_id = auth.uid())
  );

-- Marcar como leídas (solo las mías)
CREATE POLICY "notifications_update_own_read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    institution_id = public.current_user_institution()
    AND (recipient_user_id IS NULL OR recipient_user_id = auth.uid())
  )
  WITH CHECK (
    institution_id = public.current_user_institution()
    AND (recipient_user_id IS NULL OR recipient_user_id = auth.uid())
  );

CREATE INDEX notifications_recipient_idx ON public.notifications(institution_id, recipient_user_id, created_at DESC);

-- =============================================================
-- 7) FUNCTION: save_attendance (upsert atómico)
-- =============================================================
CREATE OR REPLACE FUNCTION public.save_attendance(
  _classroom_id uuid,
  _date date,
  _records jsonb,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _institution_id uuid;
  _classroom_institution uuid;
  _homeroom_teacher_id uuid;
  _teacher_user_id uuid;
  _session_id uuid;
  _is_director boolean;
  _rec jsonb;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT institution_id INTO _institution_id
  FROM public.profiles WHERE id = _user_id;

  IF _institution_id IS NULL THEN
    RAISE EXCEPTION 'Perfil sin institución' USING ERRCODE = '22023';
  END IF;

  SELECT institution_id, homeroom_teacher_id
    INTO _classroom_institution, _homeroom_teacher_id
  FROM public.classrooms WHERE id = _classroom_id;

  IF _classroom_institution IS NULL OR _classroom_institution <> _institution_id THEN
    RAISE EXCEPTION 'Aula no encontrada' USING ERRCODE = '42501';
  END IF;

  _is_director := public.has_role(_user_id, 'director');

  IF NOT _is_director THEN
    -- Debe ser docente titular
    SELECT user_id INTO _teacher_user_id
    FROM public.teachers WHERE id = _homeroom_teacher_id;

    IF _teacher_user_id IS NULL OR _teacher_user_id <> _user_id THEN
      RAISE EXCEPTION 'No tienes permiso sobre esta aula' USING ERRCODE = '42501';
    END IF;

    -- Ventana: sólo hoy
    IF _date <> current_date THEN
      RAISE EXCEPTION 'Sólo puedes registrar asistencia del día actual' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Upsert sesión
  INSERT INTO public.attendance_sessions (classroom_id, institution_id, date, taken_by, notes)
  VALUES (_classroom_id, _institution_id, _date, _user_id, _notes)
  ON CONFLICT (classroom_id, date)
  DO UPDATE SET taken_by = EXCLUDED.taken_by, notes = COALESCE(EXCLUDED.notes, attendance_sessions.notes), updated_at = now()
  RETURNING id INTO _session_id;

  -- Reemplazar registros
  FOR _rec IN SELECT * FROM jsonb_array_elements(_records) LOOP
    INSERT INTO public.attendance_records (session_id, student_id, status, note)
    VALUES (
      _session_id,
      (_rec->>'student_id')::uuid,
      (_rec->>'status')::public.attendance_status,
      NULLIF(_rec->>'note', '')
    )
    ON CONFLICT (session_id, student_id)
    DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note, updated_at = now();
  END LOOP;

  RETURN _session_id;
END;
$$;

-- =============================================================
-- 8) FUNCTION: attendance_stats_student
-- =============================================================
CREATE OR REPLACE FUNCTION public.attendance_stats_student(_student_id uuid)
RETURNS TABLE(
  total_sessions int,
  presente_count int,
  tardanza_count int,
  ausente_count int,
  justificado_count int,
  attendance_pct numeric,
  last_date date
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH s AS (
    SELECT r.status, sess.date
    FROM public.attendance_records r
    JOIN public.attendance_sessions sess ON sess.id = r.session_id
    WHERE r.student_id = _student_id
      AND sess.institution_id = public.current_user_institution()
  )
  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE status = 'presente')::int,
    COUNT(*) FILTER (WHERE status = 'tardanza')::int,
    COUNT(*) FILTER (WHERE status = 'ausente')::int,
    COUNT(*) FILTER (WHERE status = 'justificado')::int,
    CASE WHEN COUNT(*) = 0 THEN 0
         ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('presente', 'tardanza', 'justificado')) / COUNT(*), 1)
    END,
    MAX(date)
  FROM s;
$$;

-- =============================================================
-- 9) FUNCTION: attendance_stats_classroom
-- =============================================================
CREATE OR REPLACE FUNCTION public.attendance_stats_classroom(_classroom_id uuid)
RETURNS TABLE(
  total_sessions int,
  attendance_pct numeric,
  last_date date
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH s AS (
    SELECT r.status, sess.date
    FROM public.attendance_records r
    JOIN public.attendance_sessions sess ON sess.id = r.session_id
    WHERE sess.classroom_id = _classroom_id
      AND sess.institution_id = public.current_user_institution()
  )
  SELECT
    (SELECT COUNT(DISTINCT date)::int FROM s),
    CASE WHEN COUNT(*) = 0 THEN 0
         ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('presente', 'tardanza', 'justificado')) / COUNT(*), 1)
    END,
    MAX(date)
  FROM s;
$$;

-- =============================================================
-- 10) FUNCTION: director_dashboard_stats
-- =============================================================
CREATE OR REPLACE FUNCTION public.director_dashboard_stats()
RETURNS TABLE(
  total_students int,
  total_teachers int,
  total_classrooms int,
  today_sessions int,
  today_present int,
  today_late int,
  today_absent int,
  today_pct numeric,
  pending_classrooms int
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH inst AS (SELECT public.current_user_institution() AS id),
  today_recs AS (
    SELECT r.status
    FROM public.attendance_records r
    JOIN public.attendance_sessions sess ON sess.id = r.session_id, inst
    WHERE sess.date = current_date AND sess.institution_id = inst.id
  )
  SELECT
    (SELECT COUNT(*)::int FROM public.students, inst WHERE students.institution_id = inst.id AND status = 'activo'),
    (SELECT COUNT(*)::int FROM public.teachers, inst WHERE teachers.institution_id = inst.id AND status = 'activo'),
    (SELECT COUNT(*)::int FROM public.classrooms, inst WHERE classrooms.institution_id = inst.id),
    (SELECT COUNT(*)::int FROM public.attendance_sessions, inst WHERE attendance_sessions.institution_id = inst.id AND date = current_date),
    (SELECT COUNT(*)::int FROM today_recs WHERE status = 'presente'),
    (SELECT COUNT(*)::int FROM today_recs WHERE status = 'tardanza'),
    (SELECT COUNT(*)::int FROM today_recs WHERE status = 'ausente'),
    (SELECT CASE WHEN COUNT(*) = 0 THEN 0
                 ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('presente','tardanza','justificado')) / COUNT(*), 1) END
     FROM today_recs),
    (SELECT COUNT(*)::int FROM public.classrooms c, inst
       WHERE c.institution_id = inst.id
         AND c.homeroom_teacher_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM public.attendance_sessions s WHERE s.classroom_id = c.id AND s.date = current_date));
$$;

-- =============================================================
-- 11) FUNCTION: attendance_last_7_days
-- =============================================================
CREATE OR REPLACE FUNCTION public.attendance_last_7_days()
RETURNS TABLE(day date, attendance_pct numeric, total_records int)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT generate_series(current_date - interval '6 days', current_date, interval '1 day')::date AS d
  ),
  recs AS (
    SELECT sess.date AS d, r.status
    FROM public.attendance_records r
    JOIN public.attendance_sessions sess ON sess.id = r.session_id
    WHERE sess.institution_id = public.current_user_institution()
      AND sess.date >= current_date - interval '6 days'
  )
  SELECT days.d,
         CASE WHEN COUNT(recs.status) = 0 THEN 0
              ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE recs.status IN ('presente','tardanza','justificado')) / COUNT(recs.status), 1)
         END,
         COUNT(recs.status)::int
  FROM days LEFT JOIN recs ON recs.d = days.d
  GROUP BY days.d
  ORDER BY days.d;
$$;

-- =============================================================
-- 12) TRIGGER: notification on new attendance session
-- =============================================================
CREATE OR REPLACE FUNCTION public.notify_attendance_taken()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _director_id uuid;
  _classroom_name text;
  _teacher_name text;
BEGIN
  IF TG_OP = 'UPDATE' THEN RETURN NEW; END IF;

  SELECT ur.user_id INTO _director_id
  FROM public.user_roles ur
  WHERE ur.institution_id = NEW.institution_id AND ur.role = 'director'
  LIMIT 1;

  SELECT name INTO _classroom_name FROM public.classrooms WHERE id = NEW.classroom_id;
  SELECT full_name INTO _teacher_name FROM public.profiles WHERE id = NEW.taken_by;

  IF _director_id IS NOT NULL AND _director_id <> NEW.taken_by THEN
    INSERT INTO public.notifications (institution_id, recipient_user_id, type, title, body, metadata)
    VALUES (
      NEW.institution_id,
      _director_id,
      'attendance_taken',
      'Asistencia registrada',
      COALESCE(_teacher_name, 'Un docente') || ' registró la asistencia de ' || COALESCE(_classroom_name, 'un aula') || '.',
      jsonb_build_object('classroom_id', NEW.classroom_id, 'session_id', NEW.id, 'date', NEW.date)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER attendance_sessions_notify
  AFTER INSERT ON public.attendance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.notify_attendance_taken();

-- =============================================================
-- 13) TRIGGER: notification on new student
-- =============================================================
CREATE OR REPLACE FUNCTION public.notify_student_registered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (institution_id, recipient_user_id, type, title, body, metadata)
  VALUES (
    NEW.institution_id,
    NULL,
    'student_registered',
    'Nuevo estudiante',
    'Se registró a ' || NEW.full_name || ' en ' || NEW.grade || ' — ' || NEW.section || '.',
    jsonb_build_object('student_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER students_notify
  AFTER INSERT ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.notify_student_registered();

-- =============================================================
-- 14) TRIGGER: notification when teacher accepts invitation
-- =============================================================
CREATE OR REPLACE FUNCTION public.notify_teacher_joined()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _director_id uuid;
BEGIN
  IF OLD.user_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT ur.user_id INTO _director_id
    FROM public.user_roles ur
    WHERE ur.institution_id = NEW.institution_id AND ur.role = 'director'
    LIMIT 1;

    IF _director_id IS NOT NULL THEN
      INSERT INTO public.notifications (institution_id, recipient_user_id, type, title, body, metadata)
      VALUES (
        NEW.institution_id,
        _director_id,
        'teacher_joined',
        'Nuevo docente activo',
        NEW.full_name || ' aceptó la invitación y se unió a la institución.',
        jsonb_build_object('teacher_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER teachers_notify_joined
  AFTER UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.notify_teacher_joined();

-- =============================================================
-- 15) REALTIME publication
-- =============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;
