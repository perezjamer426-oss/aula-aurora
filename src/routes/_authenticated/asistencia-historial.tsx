import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { EmptyState } from "@/components/ui/empty-state";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SelectField } from "@/components/form/SelectField";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { AttendanceStatusPill, type AttendanceStatus } from "@/components/attendance/AttendanceStatusPill";

export const Route = createFileRoute("/_authenticated/asistencia-historial")({
  component: AttendanceHistory,
});

interface SessionRow {
  id: string;
  date: string;
  classroom_id: string;
  classroom_name: string;
  taken_by_name: string | null;
  presente: number;
  tardanza: number;
  ausente: number;
  justificado: number;
}

function AttendanceHistory() {
  const navigate = useNavigate();
  const { isDirector, userId, loading } = useUserRole();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [classroomFilter, setClassroomFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (loading) return;
    (async () => {
      setBusy(true);

      let allowedClassroomIds: string[] | null = null;
      if (!isDirector && userId) {
        const { data: t } = await supabase
          .from("teachers")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (t) {
          const { data: cls } = await supabase
            .from("classrooms")
            .select("id, name")
            .eq("homeroom_teacher_id", t.id);
          allowedClassroomIds = (cls ?? []).map((c) => c.id);
          setClassrooms(cls ?? []);
        } else {
          setClassrooms([]);
          allowedClassroomIds = [];
        }
      } else {
        const { data: cls } = await supabase.from("classrooms").select("id, name");
        setClassrooms(cls ?? []);
      }

      let q = supabase
        .from("attendance_sessions")
        .select(
          "id, date, classroom_id, taken_by, classrooms:classroom_id(name)",
        )
        .order("date", { ascending: false })
        .limit(100);
      if (classroomFilter) q = q.eq("classroom_id", classroomFilter);
      if (dateFilter) q = q.eq("date", dateFilter);
      if (allowedClassroomIds !== null) {
        if (allowedClassroomIds.length === 0) {
          setRows([]);
          setBusy(false);
          return;
        }
        q = q.in("classroom_id", allowedClassroomIds);
      }

      const { data: sessions, error } = await q;
      if (error) {
        toast.error("No se pudo cargar el historial");
        setBusy(false);
        return;
      }

      // Cargar profiles de taken_by + contadores
      const ids = Array.from(new Set((sessions ?? []).map((s: any) => s.taken_by)));
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] as any[] };
      const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name as string]));

      const enriched: SessionRow[] = [];
      for (const s of sessions ?? []) {
        const { data: recs } = await supabase
          .from("attendance_records")
          .select("status")
          .eq("session_id", s.id);
        const counts = { presente: 0, tardanza: 0, ausente: 0, justificado: 0 };
        (recs ?? []).forEach((r: any) => {
          counts[r.status as AttendanceStatus]++;
        });
        enriched.push({
          id: s.id,
          date: s.date,
          classroom_id: s.classroom_id,
          classroom_name: (s as any).classrooms?.name ?? "—",
          taken_by_name: nameById.get(s.taken_by) ?? null,
          ...counts,
        });
      }
      setRows(enriched);
      setBusy(false);
    })();
  }, [loading, isDirector, userId, classroomFilter, dateFilter]);

  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-radial-primary"
      />
      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              onClick={() => navigate({ to: "/asistencia" })}
              className="inline-flex h-9 items-center rounded-full border border-border bg-background px-3.5 text-xs font-medium hover:bg-accent"
            >
              ← Asistencia
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-10 pb-16">
        <div>
          <p className="text-sm font-medium text-primary">Historial</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Asistencia registrada
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {isDirector
              ? "Consulta la asistencia de todas las aulas de tu institución."
              : "Consulta la asistencia de tus aulas."}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SelectField
            label="Aula"
            value={classroomFilter}
            onChange={(e) => setClassroomFilter(e.target.value)}
            options={[
              { value: "", label: "Todas" },
              ...classrooms.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Fecha</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setClassroomFilter("");
                setDateFilter("");
              }}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-background text-sm font-medium hover:bg-accent"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <div className="mt-8">
          {busy ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-card" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="No hay asistencia registrada"
              description="Cuando se registre asistencia, aparecerá aquí ordenada por fecha."
            />
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{r.classroom_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.date + "T00:00:00").toLocaleDateString("es-ES", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                      {r.taken_by_name && ` · ${r.taken_by_name}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {r.presente > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        {r.presente} presente
                      </span>
                    )}
                    {r.tardanza > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        {r.tardanza} tarde
                      </span>
                    )}
                    {r.ausente > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                        {r.ausente} ausente
                      </span>
                    )}
                    {r.justificado > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                        {r.justificado} justificado
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        navigate({
                          to: "/asistencia/$classroomId",
                          params: { classroomId: r.classroom_id },
                        })
                      }
                      className="inline-flex h-7 items-center rounded-full border border-border bg-background px-2.5 text-[11px] font-medium hover:bg-accent"
                    >
                      Abrir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Reference to avoid unused import warning */}
        {false && <AttendanceStatusPill status="presente" />}
      </main>
    </div>
  );
}
