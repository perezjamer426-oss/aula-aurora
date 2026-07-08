import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { EmptyState } from "@/components/ui/empty-state";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

export const Route = createFileRoute("/_authenticated/asistencia")({
  component: AttendanceScreen,
});

interface ClassroomItem {
  id: string;
  name: string;
  grade: string;
  section: string;
  student_count: number;
  taken_today: boolean;
}

function AttendanceScreen() {
  const navigate = useNavigate();
  const { userId, isDirector, isTeacher, loading } = useUserRole();
  const [rows, setRows] = useState<ClassroomItem[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!isDirector && !isTeacher) return;
    (async () => {
      setBusy(true);
      let q = supabase
        .from("classrooms")
        .select("id, name, grade, section, homeroom_teacher_id");
      if (!isDirector && userId) {
        // Solo aulas donde el docente es titular
        const { data: teacher } = await supabase
          .from("teachers")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (!teacher) {
          setRows([]);
          setBusy(false);
          return;
        }
        q = q.eq("homeroom_teacher_id", teacher.id);
      }
      const { data, error } = await q.order("grade").order("section");
      if (error) {
        toast.error("No se pudieron cargar las aulas");
        setBusy(false);
        return;
      }
      const list: ClassroomItem[] = [];
      for (const c of data ?? []) {
        const { count } = await supabase
          .from("classroom_students")
          .select("id", { count: "exact", head: true })
          .eq("classroom_id", c.id);
        const { data: today } = await supabase
          .from("attendance_sessions")
          .select("id")
          .eq("classroom_id", c.id)
          .eq("date", new Date().toISOString().slice(0, 10))
          .maybeSingle();
        list.push({
          id: c.id,
          name: c.name,
          grade: c.grade,
          section: c.section,
          student_count: count ?? 0,
          taken_today: !!today,
        });
      }
      setRows(list);
      setBusy(false);
    })();
  }, [loading, isDirector, isTeacher, userId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[300px] bg-radial-primary"
      />
      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              onClick={() =>
                navigate({ to: isDirector ? "/panel" : "/panel-docente" })
              }
              className="inline-flex h-9 items-center rounded-full border border-border bg-background px-3.5 text-xs font-medium hover:bg-accent"
            >
              ← Panel
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-10 pb-16">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Asistencia</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {isDirector ? "Aulas de la institución" : "Mis aulas"}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {isDirector
                ? "Supervisa qué aulas ya registraron su asistencia del día."
                : "Toma la asistencia rápida de cada estudiante."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/asistencia-historial" })}
            className="inline-flex h-9 items-center rounded-full border border-border bg-background px-3.5 text-xs font-medium hover:bg-accent"
          >
            Ver historial
          </button>
        </div>

        <div className="mt-8">
          {busy ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title={isDirector ? "Aún no hay aulas creadas" : "No tienes aulas asignadas"}
              description={
                isDirector
                  ? "Crea aulas y asigna docentes titulares para empezar a registrar asistencia."
                  : "Cuando el director te asigne como docente titular, tus aulas aparecerán aquí."
              }
              action={
                isDirector ? (
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/aulas" })}
                    className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Ir a Aulas
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((r) => (
                <article
                  key={r.id}
                  className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-sm font-semibold text-foreground">
                        {r.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.grade} · Sección {r.section} · {r.student_count} estudiantes
                      </p>
                    </div>
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider " +
                        (r.taken_today
                          ? "bg-primary-soft text-primary"
                          : "bg-amber-100 text-amber-700")
                      }
                    >
                      {r.taken_today ? "Hoy ✓" : "Pendiente"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        to: "/asistencia/$classroomId",
                        params: { classroomId: r.id },
                      })
                    }
                    disabled={r.student_count === 0}
                    className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {r.student_count === 0
                      ? "Sin estudiantes"
                      : isDirector
                        ? r.taken_today
                          ? "Ver asistencia"
                          : "Ver / Corregir"
                        : r.taken_today
                          ? "Editar asistencia"
                          : "Tomar asistencia"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
