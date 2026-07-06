
CREATE TYPE public.student_status AS ENUM ('activo', 'inactivo');

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  photo_url text CHECK (photo_url IS NULL OR char_length(photo_url) <= 1024),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 160),
  dni text CHECK (dni IS NULL OR char_length(dni) <= 40),
  grade text NOT NULL CHECK (char_length(grade) BETWEEN 1 AND 40),
  section text NOT NULL CHECK (char_length(section) BETWEEN 1 AND 20),
  birth_date date,
  guardian_name text CHECK (guardian_name IS NULL OR char_length(guardian_name) <= 160),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 40),
  email text CHECK (email IS NULL OR char_length(email) <= 160),
  status public.student_status NOT NULL DEFAULT 'activo',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_students_institution ON public.students(institution_id);
CREATE INDEX idx_students_grade_section ON public.students(institution_id, grade, section);

CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.current_user_institution()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT institution_id FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_user_institution() TO authenticated;

CREATE POLICY "students_select_same_institution"
  ON public.students FOR SELECT TO authenticated
  USING (institution_id = public.current_user_institution());

CREATE POLICY "students_insert_director"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (
    institution_id = public.current_user_institution()
    AND public.has_role(auth.uid(), 'director')
    AND created_by = auth.uid()
  );

CREATE POLICY "students_update_director"
  ON public.students FOR UPDATE TO authenticated
  USING (
    institution_id = public.current_user_institution()
    AND public.has_role(auth.uid(), 'director')
  )
  WITH CHECK (
    institution_id = public.current_user_institution()
    AND public.has_role(auth.uid(), 'director')
  );

CREATE POLICY "students_delete_director"
  ON public.students FOR DELETE TO authenticated
  USING (
    institution_id = public.current_user_institution()
    AND public.has_role(auth.uid(), 'director')
  );
