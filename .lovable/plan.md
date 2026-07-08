
# Módulo de Asistencia — AureoSense

Alcance aprobado: **Núcleo + Notificaciones + Gráficos**, aulas explícitas, 4 estados, docente edita el mismo día y director corrige cualquier fecha.

## 1. Base de datos (una sola migración)

Nuevas tablas en `public` (con GRANT + RLS):

- **`classrooms`** — `id`, `institution_id`, `name`, `grade`, `section`, `homeroom_teacher_id` (nullable, FK `teachers`), `created_by`, timestamps. Único por (`institution_id`, `grade`, `section`).
- **`classroom_students`** — pivote `classroom_id` ↔ `student_id`. Un estudiante en un aula por institución.
- **`attendance_sessions`** — `id`, `classroom_id`, `institution_id`, `date` (DATE), `taken_by` (teacher user_id), `notes`, timestamps. Único por (`classroom_id`, `date`).
- **`attendance_records`** — `id`, `session_id`, `student_id`, `status` enum (`presente|tardanza|ausente|justificado`), `note` (para justificados), timestamps.
- **`notifications`** — `id`, `institution_id`, `recipient_user_id` (nullable = broadcast institución), `type`, `title`, `body`, `metadata jsonb`, `read_at`, `created_at`.

Nuevo enum: `attendance_status`.

### RLS
- `classrooms`, `classroom_students`: director CRUD; docente SELECT solo aulas donde es `homeroom_teacher_id`.
- `attendance_sessions` / `attendance_records`:
  - Docente titular: INSERT/UPDATE si `date = current_date` (mismo día).
  - Director: SELECT todo + UPDATE cualquier fecha.
  - Todos los usuarios de la institución: SELECT (para perfil de estudiante).
- `notifications`: usuarios de la institución ven las suyas + broadcast; solo triggers/RPC insertan.

### Funciones RPC (SECURITY DEFINER)
- `save_attendance(_classroom_id, _date, _records jsonb)` — upsert sesión + records atómico. Valida permisos y ventana de edición.
- `attendance_stats_student(_student_id)` — %asistencia, ausencias, tardanzas, última fecha.
- `attendance_stats_classroom(_classroom_id, _from, _to)` — % por aula.
- `director_dashboard_stats()` — números para el panel.
- `classrooms_pending_today()` — aulas sin asistencia hoy.

### Triggers de notificación
- Al insertar `attendance_sessions` → notificación al director "Aula X registró asistencia".
- Al insertar `teachers` con user_id → "Nuevo docente se unió".
- Al insertar `students` → "Nuevo estudiante registrado".

## 2. Rutas nuevas

Bajo `_authenticated/`:
- `aulas.tsx` — director: lista + crear + asignar docente y estudiantes.
- `aulas.$classroomId.tsx` — detalle de aula (director y docente titular).
- `asistencia.tsx` — docente: lista de sus aulas con botón "Tomar asistencia".
- `asistencia.$classroomId.tsx` — pantalla de toma rápida (tap por estudiante).
- `asistencia-historial.tsx` — historial con filtros (rol-aware).
- `notificaciones.tsx` — centro de notificaciones.

## 3. Componentes reutilizables

- `AttendanceStatusPill` — 4 estados con color e ícono.
- `AttendanceQuickRow` — foto + nombre + 4 botones grandes tap-first.
- `AttendanceProgress` — barra "18 / 24 registrados".
- `ClassroomCard` — nombre, docente titular, N° estudiantes, % asistencia, botón acción.
- `StatCard` — widget numérico del dashboard.
- `AttendanceChart` — gráfico semanal usando `recharts` (ya viene con shadcn).
- `NotificationBell` + `NotificationCard` — con badge de no leídas.
- `EmptyState` — componente único (ilustración + título + descripción + CTA), reemplaza los empty states dispersos.

## 4. Mejoras a pantallas existentes (sin rediseñar)

- **Panel director** (`panel.tsx`): reemplaza el estado vacío por widgets reales (StatCards + gráfico semanal + notificaciones recientes + aulas pendientes). Mantiene el layout y estilo actual.
- **Panel docente** (`panel-docente.tsx`): tarjetas conectadas a datos reales; "Asistencia" abre `/asistencia`.
- **Perfil de estudiante** (`StudentProfileDialog`): agrega sección "Asistencia" con % + totales + últimas 5 sesiones.
- **Card de estudiante en lista**: sin cambios visuales, solo datos reales.

## 5. Reglas de permisos (frontend)
- Docente accede solo a sus aulas asignadas (server + client checks).
- Director no ve botones de "Tomar asistencia" (solo "Ver").
- Historial: docente ve solo sus aulas; director ve todas.

## 6. Realtime
- Suscripción a `notifications` en el layout autenticado → toast + badge.
- Panel director suscrito a `attendance_sessions` para refrescar widgets.

## 7. QA final

- Hydration fix del error actual en `iniciar-sesion` (AuthLayout).
- Revisar spacing/tipografía en todas las pantallas nuevas contra las existentes (mismo `bg-radial-primary`, mismo header, mismos radios).
- Empty states unificados con ilustraciones ya presentes o SVG inline.
- Loading skeletons en cada pantalla nueva.
- Todo en español, sin datos falsos, todo empieza vacío.

## Notas técnicas

- Instalar `recharts` (o usar shadcn `chart` si ya está en `components.json`).
- La ventana de edición del docente se valida en RPC vía `date_trunc('day', now())` con timezone del director (usaremos `now()::date` server-side; suficiente para demo).
- Migración de estudiantes existentes: al crear la primera aula que matchea `(grade, section)`, se ofrece "Importar estudiantes existentes" — no se migra automáticamente para no romper datos aprobados.
- Fix hydration: envolver contenido dinámico de `AuthLayout` o quitar `Suspense` innecesario que causa el mismatch.

Todo el trabajo cabe en ~1 migración + ~15 archivos nuevos + ~4 archivos editados. Cero cambios en autenticación, registro de institución/director, tablas existentes de students/teachers, ni en el sistema de invitaciones.
