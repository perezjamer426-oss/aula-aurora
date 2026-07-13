import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  School,
  User,
  Users,
  ClipboardCheck,
  History,
  ThermometerSun,
  Plus,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ActionButton } from "@/components/ui/action-button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import {
  ComfortEvaluationDialog,
  comfortColor,
  COMFORT_CRITERIA_LABELS,
  COMFORT_RATING_LABELS,
  type ComfortRating,
} from "@/components/classrooms/ComfortEvaluationDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/aulas/$classroomId")({
  component: ClassroomDetail,
});

interface Detail {
  id: string;
  name: string;
  grade: string;
  section: string;
  institution_id: string;
  homeroom_teacher_id: string | null;
  teacher_name: string | null;
  student_count: number;
  attendance_pct: number;
  last_session_date: string | null;
}

interface ComfortRow {
  id: string;
  comfort_index: number;
  temperatura: ComfortRating;
  ventilacion: ComfortRating;
  iluminacion: ComfortRating;
  ruido: ComfortRating;
  limpieza: ComfortRating;
  mobiliario: ComfortRating;
  notes: string | null;
  created_at: string;
  evaluator_name?: string | null;
}

function ClassroomDetail() {
  const { classroomId } = Route.useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [comfort, setComfort] = useState<ComfortRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [comfortOpen, setComfortOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: c, error } = await supabase
      .from("classrooms")
      .select(
        "id, name, grade, section, institution_id, homeroom_teacher_id, teachers:homeroom_teacher_id(full_name)",
      )
      .eq("id", classroomId)
      .maybeSingle();

    if (error || !c) {
      toast.error("Aula no encontrada");
      navigate({ to: "/aulas", replace: true });
      return;
    }

    const [{ count }, statsRes, lastRes, comfortRes] = await Promise.all([
      supabase
        .from("classroom_students")
        .select("id", { count: "exact", head: true })
        .eq("classroom_id", classroomId),
      supabase.rpc("attendance_stats_classroom", { _classroom_id: classroomId }),
      supabase
        .from("attendance_sessions")
        .select("date")
        .eq("classroom_id", classroomId)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("classroom_comfort_evaluations")
        .select(
          "id, comfort_index, temperatura, ventilacion, iluminacion, ruido, limpieza, mobiliario, notes, created_at, evaluator:profiles!evaluated_by(full_name)",
        )
        .eq("classroom_id", classroomId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setDetail({
      id: c.id,
      name: c.name,
      grade: c.grade,
      section: c.section,
      institution_id: (c as any).institution_id,
      homeroom_teacher_id: c.homeroom_teacher_id,
      teacher_name: (c as any).teachers?.full_name ?? null,
      student_count: count ?? 0,
      attendance_pct: statsRes.data?.[0]?.attendance_pct ?? 0,
      last_session_date: (lastRes.data as any)?.date ?? null,
    });

    setComfort(
      ((comfortRes.data ?? []) as any[]).map((r) => ({
        ...r,
        evaluator_name: r.evaluator?.full_name ?? null,
      })),
    );
    setLoading(false);
  }, [classroomId, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !detail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Cargando aula…</p>
      </div>
    );
  }

  const status =
    detail.attendance_pct >= 85
      ? { label: "Activa", tone: "emerald" as const }
      : detail.attendance_pct >= 50
        ? { label: "En seguimiento", tone: "amber" as const }
        : detail.student_count === 0
          ? { label: "Sin estudiantes", tone: "muted" as const }
          : { label: "Requiere atención", tone: "rose" as const };

  const latestComfort = comfort[0];

  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[280px] bg-radial-primary"
      />

      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link
              to="/aulas"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-xs font-medium hover:bg-accent"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Aulas
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-10 pb-16">
        {/* Encabezado del aula */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Aula</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {detail.name}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {detail.grade} · Sección {detail.section}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider",
              status.tone === "emerald" &&
                "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
              status.tone === "amber" &&
                "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
              status.tone === "rose" &&
                "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
              status.tone === "muted" && "bg-muted text-muted-foreground",
            )}
          >
            {status.label}
          </span>
        </div>

        {/* KPIs del aula */}
        <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            icon={<User className="h-4 w-4" />}
            label="Docente titular"
            value={detail.teacher_name ?? "Sin asignar"}
            small
          />
          <MetricCard
            icon={<Users className="h-4 w-4" />}
            label="Estudiantes"
            value={String(detail.student_count)}
          />
          <MetricCard
            icon={<ClipboardCheck className="h-4 w-4" />}
            label="Asistencia"
            value={`${detail.attendance_pct}%`}
          />
          <MetricCard
            icon={<History className="h-4 w-4" />}
            label="Última sesión"
            value={
              detail.last_session_date
                ? new Date(detail.last_session_date).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                  })
                : "—"
            }
            small
          />
        </section>

        {/* Accesos rápidos */}
        <section className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/asistencia/$classroomId"
            params={{ classroomId }}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <ClipboardCheck className="h-4 w-4" />
            Tomar asistencia
          </Link>
          <Link
            to="/asistencia-historial"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-background px-4 text-sm font-medium hover:bg-accent"
          >
            <History className="h-4 w-4" />
            Historial
          </Link>
        </section>

        {/* Confort del aula */}
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <ThermometerSun className="h-4 w-4" />
                </span>
                <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                  Confort del aula
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Evalúa el entorno físico del aula y observa su evolución.
              </p>
            </div>
            <ActionButton onClick={() => setComfortOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva evaluación
            </ActionButton>
          </div>

          {/* Índice actual */}
          {latestComfort ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <ComfortIndexCard row={latestComfort} />
              <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-sm)] sm:p-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Última evaluación · desglose
                </h3>
                <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(
                    ["temperatura", "ventilacion", "iluminacion", "ruido", "limpieza", "mobiliario"] as const
                  ).map((k) => (
                    <div
                      key={k}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-background px-3 py-2"
                    >
                      <dt className="text-xs text-muted-foreground">
                        {COMFORT_CRITERIA_LABELS[k]}
                      </dt>
                      <dd className="text-xs font-semibold text-foreground">
                        {COMFORT_RATING_LABELS[latestComfort[k]]}
                      </dd>
                    </div>
                  ))}
                </dl>
                {latestComfort.notes && (
                  <p className="mt-3 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                    {latestComfort.notes}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title="Sin evaluaciones aún"
                description="Registra la primera evaluación para conocer el índice de confort de esta aula."
                action={
                  <ActionButton onClick={() => setComfortOpen(true)}>
                    Nueva evaluación
                  </ActionButton>
                }
              />
            </div>
          )}

          {/* Historial */}
          {comfort.length > 1 && (
            <div className="mt-8">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Historial de evaluaciones
              </h3>
              <ul className="mt-3 space-y-2">
                {comfort.slice(1).map((row) => {
                  const c = comfortColor(row.comfort_index);
                  return (
                    <li
                      key={row.id}
                      className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {new Date(row.created_at).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {row.evaluator_name ?? "—"}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                          c.bg,
                          c.text,
                        )}
                      >
                        {row.comfort_index}
                        <span className="text-[10px] font-medium">/100</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      </main>

      <ComfortEvaluationDialog
        open={comfortOpen}
        onOpenChange={setComfortOpen}
        classroomId={detail.id}
        institutionId={detail.institution_id}
        onSaved={() => {
          setComfortOpen(false);
          load();
        }}
      />
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft text-primary">
          {icon}
        </span>
      </div>
      <p
        className={cn(
          "mt-3 font-display font-semibold tracking-tight text-foreground",
          small ? "text-base" : "text-2xl",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ComfortIndexCard({ row }: { row: ComfortRow }) {
  const c = comfortColor(row.comfort_index);
  return (
    <div className={cn("rounded-3xl border border-border p-6 shadow-[var(--shadow-sm)]", c.bg)}>
      <p className={cn("text-[10px] font-semibold uppercase tracking-wider", c.text)}>
        Índice de confort
      </p>
      <p className={cn("mt-2 font-display text-5xl font-bold tracking-tight", c.text)}>
        {row.comfort_index}
        <span className="ml-1 text-lg font-semibold opacity-70">/100</span>
      </p>
      <p className={cn("mt-2 text-sm font-semibold", c.text)}>{c.label}</p>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Evaluado el{" "}
        {new Date(row.created_at).toLocaleDateString("es-ES", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
    </div>
  );
}
