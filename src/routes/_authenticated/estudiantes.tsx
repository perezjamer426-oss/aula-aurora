import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { SelectField } from "@/components/form/SelectField";
import { StudentAvatar } from "@/components/students/StudentAvatar";
import {
  StudentFormDialog,
  type StudentRow,
} from "@/components/students/StudentFormDialog";
import { StudentProfileDialog } from "@/components/students/StudentProfileDialog";

/** Pantalla de gestión de estudiantes. */
export const Route = createFileRoute("/_authenticated/estudiantes")({
  component: EstudiantesPage,
});

function EstudiantesPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [institutionName, setInstitutionName] = useState<string>("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [sectionFilter, setSectionFilter] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [viewing, setViewing] = useState<StudentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const uid = authData.user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("institution_id, institution:institutions(name)")
        .maybeSingle();

      const iid = profile?.institution_id ?? null;
      const iname =
        (Array.isArray(profile?.institution)
          ? profile?.institution[0]?.name
          : (profile?.institution as { name?: string } | null)?.name) ?? "";

      if (cancelled) return;
      setUserId(uid);
      setInstitutionId(iid);
      setInstitutionName(iname);

      if (iid) {
        const { data: rows, error } = await supabase
          .from("students")
          .select("*")
          .order("created_at", { ascending: false });
        if (!cancelled) {
          if (error) console.error(error);
          setStudents(rows ?? []);
        }
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const grades = useMemo(
    () => Array.from(new Set(students.map((s) => s.grade))).sort(),
    [students],
  );
  const sections = useMemo(
    () => Array.from(new Set(students.map((s) => s.section))).sort(),
    [students],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (gradeFilter && s.grade !== gradeFilter) return false;
      if (sectionFilter && s.section !== sectionFilter) return false;
      if (!q) return true;
      const hay = `${s.full_name} ${s.dni ?? ""} ${s.guardian_name ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [students, query, gradeFilter, sectionFilter]);

  async function refresh() {
    if (!institutionId) return;
    const { data } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });
    setStudents(data ?? []);
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openProfile(s: StudentRow) {
    setViewing(s);
    setProfileOpen(true);
  }

  function openEditFromProfile() {
    if (!viewing) return;
    setEditing(viewing);
    setProfileOpen(false);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!viewing) return;
    if (
      !window.confirm(
        `¿Eliminar a ${viewing.full_name}? Esta acción no se puede deshacer.`,
      )
    )
      return;
    setDeleting(true);
    const { error } = await supabase.from("students").delete().eq("id", viewing.id);
    setDeleting(false);
    if (error) {
      window.alert("No pudimos eliminar el estudiante.");
      return;
    }
    setProfileOpen(false);
    setViewing(null);
    await refresh();
  }

  return (
    <div className="relative min-h-screen bg-background pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-radial-primary"
      />

      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate({ to: "/panel" })}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-accent"
              aria-label="Volver al panel"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
                <path
                  d="M12 15l-5-5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <Logo />
          </div>
          <p className="hidden text-sm font-medium text-foreground sm:block">
            {institutionName}
          </p>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-10">
        <div className="flex flex-col gap-1 animate-fade-in">
          <p className="text-sm font-medium text-primary">Estudiantes</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Gestión de estudiantes
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Registra, busca y organiza a los estudiantes de tu institución.
          </p>
        </div>

        {/* Búsqueda y filtros */}
        <div className="mt-8 grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs sm:grid-cols-[1fr_180px_160px]">
          <div className="relative">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            >
              <path
                d="m17 17-3.5-3.5M15 9a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, DNI o apoderado…"
              className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary"
            />
          </div>
          <SelectField
            label=""
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            options={[
              { value: "", label: "Todos los grados" },
              ...grades.map((g) => ({ value: g, label: g })),
            ]}
            className="!h-11"
          />
          <SelectField
            label=""
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            options={[
              { value: "", label: "Todas las secciones" },
              ...sections.map((s) => ({ value: s, label: `Sección ${s}` })),
            ]}
            className="!h-11"
          />
        </div>

        {/* Lista */}
        <section className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl border border-border bg-card/60"
                />
              ))}
            </div>
          ) : students.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : filtered.length === 0 ? (
            <NoResults />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => openProfile(s)}
                  style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                  className="group flex animate-fade-in items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
                >
                  <StudentAvatar
                    photoPath={s.photo_url}
                    name={s.full_name}
                    className="h-12 w-12"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {s.full_name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {s.grade} · Sección {s.section}
                    </p>
                    <span
                      className={
                        "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium " +
                        (s.status === "activo"
                          ? "bg-primary-soft text-primary"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      <span
                        className={
                          "h-1 w-1 rounded-full " +
                          (s.status === "activo" ? "bg-primary" : "bg-muted-foreground")
                        }
                      />
                      {s.status === "activo" ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  >
                    <path
                      d="m8 5 5 5-5 5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* FAB */}
      <button
        type="button"
        onClick={openCreate}
        className="fixed bottom-6 right-6 z-20 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:bg-primary-hover active:scale-95 sm:bottom-8 sm:right-8"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden>
          <path
            d="M10 4v12M4 10h12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        Agregar estudiante
      </button>

      {institutionId && userId && (
        <StudentFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          institutionId={institutionId}
          userId={userId}
          student={editing}
          onSaved={refresh}
        />
      )}

      <StudentProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        student={viewing}
        onEdit={openEditFromProfile}
        onDelete={handleDelete}
        deleting={deleting}
      />
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mt-4 rounded-3xl border border-dashed border-border bg-card/60 p-12 text-center shadow-xs animate-fade-in">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden>
          <path
            d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="mt-5 font-display text-lg font-semibold text-foreground">
        Aún no hay estudiantes
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
        Comienza registrando al primer estudiante de tu institución. Toda la
        información quedará organizada por grado y sección.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:bg-primary-hover"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <path
            d="M10 4v12M4 10h12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        Agregar el primero
      </button>
    </div>
  );
}

function NoResults() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center shadow-xs animate-fade-in">
      <h2 className="font-display text-base font-semibold text-foreground">
        Sin resultados
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Ajusta los filtros o revisa la búsqueda para encontrar al estudiante.
      </p>
    </div>
  );
}
