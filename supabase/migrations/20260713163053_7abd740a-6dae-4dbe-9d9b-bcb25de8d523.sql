
-- Escala de calificación
CREATE TYPE public.comfort_rating AS ENUM ('excelente', 'bueno', 'regular', 'malo', 'muy_malo');

-- Tabla de evaluaciones
CREATE TABLE public.classroom_comfort_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  evaluated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  temperatura public.comfort_rating NOT NULL,
  ventilacion public.comfort_rating NOT NULL,
  iluminacion public.comfort_rating NOT NULL,
  ruido public.comfort_rating NOT NULL,
  limpieza public.comfort_rating NOT NULL,
  mobiliario public.comfort_rating NOT NULL,
  comfort_index numeric(5,2) NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cce_classroom ON public.classroom_comfort_evaluations(classroom_id, created_at DESC);
CREATE INDEX idx_cce_institution ON public.classroom_comfort_evaluations(institution_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classroom_comfort_evaluations TO authenticated;
GRANT ALL ON public.classroom_comfort_evaluations TO service_role;

ALTER TABLE public.classroom_comfort_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cce_select_own_institution"
  ON public.classroom_comfort_evaluations FOR SELECT
  TO authenticated
  USING (institution_id = public.current_user_institution());

CREATE POLICY "cce_insert_own_institution"
  ON public.classroom_comfort_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (
    institution_id = public.current_user_institution()
    AND evaluated_by = auth.uid()
  );

CREATE POLICY "cce_update_own_or_director"
  ON public.classroom_comfort_evaluations FOR UPDATE
  TO authenticated
  USING (
    institution_id = public.current_user_institution()
    AND (evaluated_by = auth.uid() OR public.has_role(auth.uid(), 'director'))
  );

CREATE POLICY "cce_delete_own_or_director"
  ON public.classroom_comfort_evaluations FOR DELETE
  TO authenticated
  USING (
    institution_id = public.current_user_institution()
    AND (evaluated_by = auth.uid() OR public.has_role(auth.uid(), 'director'))
  );

CREATE TRIGGER trg_cce_updated_at
  BEFORE UPDATE ON public.classroom_comfort_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Función auxiliar: mapa rating -> score
CREATE OR REPLACE FUNCTION public.comfort_rating_score(_r public.comfort_rating)
RETURNS numeric
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE _r
    WHEN 'excelente' THEN 100
    WHEN 'bueno'     THEN 80
    WHEN 'regular'   THEN 60
    WHEN 'malo'      THEN 40
    WHEN 'muy_malo'  THEN 20
  END::numeric;
$$;

-- Trigger para calcular el índice antes de insertar/actualizar
CREATE OR REPLACE FUNCTION public.compute_comfort_index()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.comfort_index := ROUND((
    public.comfort_rating_score(NEW.temperatura) +
    public.comfort_rating_score(NEW.ventilacion) +
    public.comfort_rating_score(NEW.iluminacion) +
    public.comfort_rating_score(NEW.ruido) +
    public.comfort_rating_score(NEW.limpieza) +
    public.comfort_rating_score(NEW.mobiliario)
  ) / 6.0, 2);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cce_compute_index
  BEFORE INSERT OR UPDATE ON public.classroom_comfort_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.compute_comfort_index();
