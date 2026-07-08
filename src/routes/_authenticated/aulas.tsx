import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { ActionButton } from "@/components/ui/action-button";
import { EmptyState } from "@/components/ui/empty-state";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Field } from "@/components/form/Field";
import { SelectField } from "@/components/form/SelectField";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/aulas")({
  component: ClassroomsScreen,
});

interface ClassroomRow {
  id: string;
  name: string;
  grade: string;
  section: string;
  homeroom_teacher_id: string | null;
  teacher_name?: string | null;
  student_count?: number;
  attendance_pct?: number;
}

interface TeacherOption {
  id: string;
  full_name: string;
  status: string;
}

interface StudentLite {
  id: string;
  full_name: string;
  grade: string;
  section: string;
  classroom_id: string | null;
}

function ClassroomsScreen() {
  const navigate = useNavigate();
  const { isDirector, loading: roleLoading } = useUserRole();
  const [rows, setRows] = useState<ClassroomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClassroomRow | null>(null);
  const [studentsOpen, setStudentsOpen] = useState<ClassroomRow | null>(null);

  useEffect(() => {
    if (!roleLoading && !isDirector) {
      navigate({ to: "/panel-docente", replace: true });
    }
  }, [roleLoading, isDirector, navigate]);

  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase
      .from("classrooms")
      .select("id, name, grade, section, homeroom_teacher_id, teachers:homeroom_teacher_id(full_name)")
      .order("grade")
      .order("section");
    if (error) {
      toast.error("No se pudieron cargar las aulas");
      setLoading(false);
      return;
    }
    const list: ClassroomRow[] = (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      grade: r.grade,
      section: r.section,
      homeroom_teacher_id: r.homeroom_teacher_id,
      teacher_name: r.teachers?.full_name ?? null,
    }));

    // Contar estudiantes y % asistencia por aula
    await Promise.all(
      list.map(async (c) => {
        const { count } = await supabase
          .from("classroom_students")
          .select("id", { count: "exact", head: true })
          .eq("classroom_id", c.id);
        c.student_count = count ?? 0;
        const { data: stats } = await supabase.rpc("attendance_stats_classroom", {
          _classroom_id: c.id,
        });
        c.attendance_pct = stats?.[0]?.attendance_pct ?? 0;
      }),
    );

    setRows(list);
    setLoading(false);
  }

  useEffect(() => {
    if (isDirector) refresh();
  }, [isDirector]);

  async function handleDelete(row: ClassroomRow) {
    if (!confirm(`¿Eliminar el aula "${row.name}"? Se desasignarán los estudiantes.`)) return;
    const { error } = await supabase.from("classrooms").delete().eq("id", row.id);
    if (error) {
      toast.error("No se pudo eliminar");
      return;
    }
    toast.success("Aula eliminada");
    refresh();
  }

  if (roleLoading || !isDirector) {
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
              onClick={() => navigate({ to: "/panel" })}
              className="inline-flex h-9 items-center rounded-full border border-border bg-background px-3.5 text-xs font-medium hover:bg-accent"
            >
              ← Panel
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-10 pb-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Gestión académica</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Aulas
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Crea aulas, asigna un docente titular y organiza a los estudiantes.
            </p>
          </div>
          <ActionButton
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + Crear aula
          </ActionButton>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="Aún no hay aulas"
              description="Crea la primera aula para organizar a tus estudiantes y asignar docentes titulares."
              action={
                <ActionButton onClick={() => setFormOpen(true)}>Crear primera aula</ActionButton>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((r) => (
                <article
                  key={r.id}
                  className="group rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-sm font-semibold text-foreground">
                        {r.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.grade} · Sección {r.section}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                      {r.attendance_pct ?? 0}%
                    </span>
                  </div>

                  <dl className="mt-4 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Docente titular</dt>
                      <dd className="font-medium text-foreground">
                        {r.teacher_name ?? "Sin asignar"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Estudiantes</dt>
                      <dd className="font-medium text-foreground">{r.student_count ?? 0}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStudentsOpen(r)}
                      className="inline-flex h-8 items-center rounded-full border border-border bg-background px-3 text-[11px] font-medium hover:bg-accent"
                    >
                      Estudiantes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(r);
                        setFormOpen(true);
                      }}
                      className="inline-flex h-8 items-center rounded-full border border-border bg-background px-3 text-[11px] font-medium hover:bg-accent"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r)}
                      className="inline-flex h-8 items-center rounded-full border border-border bg-background px-3 text-[11px] font-medium text-destructive hover:bg-destructive/5"
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      <ClassroomFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        classroom={editing}
        onSaved={() => {
          setFormOpen(false);
          refresh();
        }}
      />
      <ClassroomStudentsDialog
        classroom={studentsOpen}
        onOpenChange={(o) => !o && setStudentsOpen(null)}
        onSaved={refresh}
      />
    </div>
  );
}

// ============================================================
// Diálogo: crear / editar aula
// ============================================================
function ClassroomFormDialog({
  open,
  onOpenChange,
  classroom,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  classroom: ClassroomRow | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setName(classroom?.name ?? "");
    setGrade(classroom?.grade ?? "");
    setSection(classroom?.section ?? "");
    setTeacherId(classroom?.homeroom_teacher_id ?? "");
    setErrors({});
    supabase
      .from("teachers")
      .select("id, full_name, status")
      .in("status", ["activo", "pendiente"])
      .order("full_name")
      .then(({ data }) => setTeachers((data ?? []) as TeacherOption[]));
  }, [open, classroom]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Ingresa un nombre";
    if (!grade.trim()) errs.grade = "Ingresa el grado";
    if (!section.trim()) errs.section = "Ingresa la sección";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("institution_id")
      .maybeSingle();
    if (!uid || !profile?.institution_id) {
      toast.error("Sesión no válida");
      setSaving(false);
      return;
    }

    const payload = {
      name: name.trim(),
      grade: grade.trim(),
      section: section.trim(),
      homeroom_teacher_id: teacherId || null,
    };

    let error;
    if (classroom) {
      ({ error } = await supabase.from("classrooms").update(payload).eq("id", classroom.id));
    } else {
      ({ error } = await supabase.from("classrooms").insert({
        ...payload,
        institution_id: profile.institution_id,
        created_by: uid,
      }));
    }

    setSaving(false);
    if (error) {
      toast.error(
        error.code === "23505"
          ? "Ya existe un aula con ese grado y sección"
          : "No se pudo guardar",
      );
      return;
    }
    toast.success(classroom ? "Aula actualizada" : "Aula creada");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{classroom ? "Editar aula" : "Nueva aula"}</DialogTitle>
          <DialogDescription>
            Cada aula agrupa a un conjunto de estudiantes bajo un docente titular.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <Field
            label="Nombre del aula"
            placeholder="Ej. 3ro A — Matutino"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Grado"
              placeholder="Ej. 3ro"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              error={errors.grade}
            />
            <Field
              label="Sección"
              placeholder="Ej. A"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              error={errors.section}
            />
          </div>
          <SelectField
            label="Docente titular (opcional)"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            options={[
              { value: "", label: "Sin asignar" },
              ...teachers.map((t) => ({
                value: t.id,
                label: `${t.full_name}${t.status === "pendiente" ? " (pendiente)" : ""}`,
              })),
            ]}
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-10 items-center rounded-full border border-border bg-background px-4 text-sm font-medium hover:bg-accent"
            >
              Cancelar
            </button>
            <ActionButton type="submit" loading={saving}>
              Guardar
            </ActionButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Diálogo: asignar estudiantes a un aula
// ============================================================
function ClassroomStudentsDialog({
  classroom,
  onOpenChange,
  onSaved,
}: {
  classroom: ClassroomRow | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!classroom) return;
    setLoading(true);
    (async () => {
      const [{ data: allStudents }, { data: pivot }] = await Promise.all([
        supabase.from("students").select("id, full_name, grade, section").order("full_name"),
        supabase.from("classroom_students").select("classroom_id, student_id"),
      ]);
      const byStudent = new Map<string, string>();
      (pivot ?? []).forEach((p: any) => byStudent.set(p.student_id, p.classroom_id));
      setStudents(
        (allStudents ?? []).map((s: any) => ({
          ...s,
          classroom_id: byStudent.get(s.id) ?? null,
        })),
      );
      setLoading(false);
    })();
  }, [classroom]);

  async function toggle(student: StudentLite) {
    if (!classroom) return;
    setSaving(student.id);
    const inThis = student.classroom_id === classroom.id;
    if (inThis) {
      await supabase.from("classroom_students").delete().eq("student_id", student.id);
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("institution_id")
        .maybeSingle();
      const { data: auth } = await supabase.auth.getUser();
      if (student.classroom_id) {
        await supabase.from("classroom_students").delete().eq("student_id", student.id);
      }
      const { error } = await supabase.from("classroom_students").insert({
        classroom_id: classroom.id,
        student_id: student.id,
        institution_id: profile?.institution_id!,
        assigned_by: auth.user!.id,
      });
      if (error) {
        toast.error("No se pudo asignar");
        setSaving(null);
        return;
      }
    }
    setStudents((prev) =>
      prev.map((s) =>
        s.id === student.id ? { ...s, classroom_id: inThis ? null : classroom.id } : s,
      ),
    );
    setSaving(null);
    onSaved();
  }

  return (
    <Dialog open={!!classroom} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Estudiantes — {classroom?.name}</DialogTitle>
          <DialogDescription>
            Marca los estudiantes que pertenecen a esta aula.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
        ) : students.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay estudiantes registrados aún.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {students.map((s) => {
              const isHere = s.classroom_id === classroom?.id;
              const isElsewhere = s.classroom_id && !isHere;
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.grade} · Sección {s.section}
                      {isElsewhere && " · en otra aula"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(s)}
                    disabled={saving === s.id}
                    className={
                      "inline-flex h-8 items-center rounded-full px-3 text-[11px] font-medium transition-colors disabled:opacity-60 " +
                      (isHere
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background hover:bg-accent")
                    }
                  >
                    {isHere ? "Asignado ✓" : "Asignar"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
