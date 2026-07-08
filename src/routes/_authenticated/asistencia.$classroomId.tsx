import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { ActionButton } from "@/components/ui/action-button";
import { EmptyState } from "@/components/ui/empty-state";
import { StudentAvatar } from "@/components/students/StudentAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import type { AttendanceStatus } from "@/components/attendance/AttendanceStatusPill";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/asistencia/$classroomId")({
  component: TakeAttendance,
});

interface StudentRow {
  id: string;
  full_name: string;
  photo_url: string | null;
}

interface Classroom {
  id: string;
  name: string;
  grade: string;
  section: string;
  homeroom_teacher_id: string | null;
}

const STATUSES: { key: AttendanceStatus; label: string; short: string; color: string }[] = [
  { key: "presente", label: "Presente", short: "P", color: "emerald" },
  { key: "tardanza", label: "Tardanza", short: "T", color: "amber" },
  { key: "ausente", label: "Ausente", short: "A", color: "rose" },
  { key: "justificado", label: "Justificado", short: "J", color: "sky" },
];

const buttonColors: Record<string, { active: string; idle: string }> = {
  emerald: {
    active: "bg-emerald-500 text-white",
    idle: "border-border bg-background text-emerald-700 hover:bg-emerald-50",
  },
  amber: {
    active: "bg-amber-500 text-white",
    idle: "border-border bg-background text-amber-700 hover:bg-amber-50",
  },
  rose: {
    active: "bg-rose-500 text-white",
    idle: "border-border bg-background text-rose-700 hover:bg-rose-50",
  },
  sky: {
    active: "bg-sky-500 text-white",
    idle: "border-border bg-background text-sky-700 hover:bg-sky-50",
  },
};

function TakeAttendance() {
  const { classroomId } = useParams({ from: "/_authenticated/asistencia/$classroomId" });
  const navigate = useNavigate();
  const { isDirector, userId, loading: roleLoading } = useUserRole();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    if (roleLoading) return;
    (async () => {
      setLoading(true);
      const { data: c } = await supabase
        .from("classrooms")
        .select("id, name, grade, section, homeroom_teacher_id")
        .eq("id", classroomId)
        .maybeSingle();
      if (!c) {
        toast.error("Aula no encontrada");
        navigate({ to: "/asistencia" });
        return;
      }
      setClassroom(c as Classroom);

      // ¿Puede editar? Director siempre. Docente solo si es titular y date=today.
      let allowed = isDirector;
      if (!allowed && userId) {
        const { data: t } = await supabase
          .from("teachers")
          .select("id, user_id")
          .eq("id", c.homeroom_teacher_id ?? "")
          .maybeSingle();
        allowed = !!t && t.user_id === userId && date === today;
      }
      setCanEdit(allowed);

      // Cargar estudiantes del aula
      const { data: cs } = await supabase
        .from("classroom_students")
        .select("students:student_id(id, full_name, photo_url)")
        .eq("classroom_id", classroomId);
      const list: StudentRow[] = (cs ?? []).map((r: any) => r.students).filter(Boolean);
      list.sort((a, b) => a.full_name.localeCompare(b.full_name, "es"));
      setStudents(list);

      // Cargar sesión existente
      const { data: sess } = await supabase
        .from("attendance_sessions")
        .select("id")
        .eq("classroom_id", classroomId)
        .eq("date", date)
        .maybeSingle();
      const initial: Record<string, AttendanceStatus> = {};
      if (sess) {
        const { data: recs } = await supabase
          .from("attendance_records")
          .select("student_id, status")
          .eq("session_id", sess.id);
        (recs ?? []).forEach((r: any) => (initial[r.student_id] = r.status));
      }
      setStatuses(initial);
      setLoading(false);
    })();
  }, [classroomId, date, isDirector, userId, roleLoading, today, navigate]);

  const registered = Object.keys(statuses).length;
  const total = students.length;

  async function handleSave() {
    if (!canEdit) return;
    if (registered === 0) {
      toast.error("Marca al menos un estudiante");
      return;
    }
    setSaving(true);
    const records = Object.entries(statuses).map(([student_id, status]) => ({
      student_id,
      status,
    }));
    const { error } = await supabase.rpc("save_attendance", {
      _classroom_id: classroomId,
      _date: date,
      _records: records,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Asistencia guardada");
    navigate({ to: "/asistencia" });
  }

  function markAllPresent() {
    if (!canEdit) return;
    const next: Record<string, AttendanceStatus> = {};
    students.forEach((s) => (next[s.id] = "presente"));
    setStatuses(next);
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-radial-primary"
      />
      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Logo />
          <button
            type="button"
            onClick={() => navigate({ to: "/asistencia" })}
            className="inline-flex h-9 items-center rounded-full border border-border bg-background px-3.5 text-xs font-medium hover:bg-accent"
          >
            ← Aulas
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 pt-8 pb-24">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-primary">Asistencia</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {classroom?.name ?? "Cargando…"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {classroom ? `${classroom.grade} · Sección ${classroom.section}` : ""}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today}
              disabled={!isDirector}
              className="h-9 rounded-xl border border-input bg-background px-3 text-sm disabled:opacity-60"
            />
          </div>
          <div className="ml-auto flex flex-1 items-center gap-3">
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="font-medium text-muted-foreground">Progreso</span>
                <span className="font-semibold text-foreground">
                  {registered} / {total} registrados
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: total === 0 ? "0%" : `${(registered / total) * 100}%` }}
                />
              </div>
            </div>
            {canEdit && total > 0 && (
              <button
                type="button"
                onClick={markAllPresent}
                className="inline-flex h-8 items-center rounded-full border border-border bg-background px-3 text-[11px] font-medium hover:bg-accent"
              >
                Todos presente
              </button>
            )}
          </div>
        </div>

        {!canEdit && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            {isDirector
              ? "Vista de director — puedes revisar y corregir cualquier fecha."
              : "Solo puedes editar la asistencia del día actual."}
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-card" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              title="Aún no hay estudiantes asignados"
              description="Ve a Aulas para asignar estudiantes a esta aula."
            />
          ) : (
            <ul className="space-y-2">
              {students.map((s) => {
                const current = statuses[s.id];
                return (
                  <li
                    key={s.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:gap-4 sm:p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <StudentAvatar
                        photoPath={s.photo_url}
                        name={s.full_name}
                        className="h-10 w-10 shrink-0"
                      />
                      <p className="truncate text-sm font-medium text-foreground">
                        {s.full_name}
                      </p>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 sm:ml-auto sm:flex sm:flex-none">
                      {STATUSES.map((st) => {
                        const active = current === st.key;
                        const c = buttonColors[st.color];
                        return (
                          <button
                            key={st.key}
                            type="button"
                            disabled={!canEdit}
                            onClick={() =>
                              setStatuses((prev) => ({ ...prev, [s.id]: st.key }))
                            }
                            title={st.label}
                            className={cn(
                              "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 sm:px-3",
                              active ? cn(c.active, "border-transparent") : c.idle,
                            )}
                          >
                            <span className="sm:hidden">{st.short}</span>
                            <span className="hidden sm:inline">{st.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      {canEdit && total > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {registered === total
                ? "Todos los estudiantes registrados."
                : `${total - registered} pendiente(s)`}
            </p>
            <ActionButton onClick={handleSave} loading={saving}>
              Guardar asistencia
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
}
