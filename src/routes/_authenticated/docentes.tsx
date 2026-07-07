import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { SelectField } from "@/components/form/SelectField";
import { TeacherAvatar } from "@/components/teachers/TeacherAvatar";
import {
  TeacherFormDialog,
  type TeacherRow,
} from "@/components/teachers/TeacherFormDialog";
import { TeacherProfileDialog } from "@/components/teachers/TeacherProfileDialog";
import { InvitationCodeDialog } from "@/components/teachers/InvitationCodeDialog";

/** Gestión de docentes — solo directores. */
export const Route = createFileRoute("/_authenticated/docentes")({
  component: DocentesPage,
});

const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  activo: "Activo",
  inactivo: "Inactivo",
};

function DocentesPage() {
  const navigate = useNavigate();
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [institutionName, setInstitutionName] = useState("");
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherRow | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [viewing, setViewing] = useState<TeacherRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [codeDialog, setCodeDialog] = useState<{
    open: boolean;
    code: string | null;
    teacherName: string;
    expiresAt: string | null;
  }>({ open: false, code: null, teacherName: "", expiresAt: null });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
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
      setInstitutionId(iid);
      setInstitutionName(iname);
      if (iid) {
        const { data } = await supabase
          .from("teachers")
          .select("*")
          .order("created_at", { ascending: false });
        if (!cancelled) setTeachers(data ?? []);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return teachers.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${t.full_name} ${t.email} ${(t.subjects ?? []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [teachers, query, statusFilter]);

  async function refresh() {
    const { data } = await supabase
      .from("teachers")
      .select("*")
      .order("created_at", { ascending: false });
    setTeachers(data ?? []);
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openProfile(t: TeacherRow) {
    setViewing(t);
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
    if (!window.confirm(`¿Eliminar a ${viewing.full_name}? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("teachers").delete().eq("id", viewing.id);
    setDeleting(false);
    if (error) {
      window.alert("No pudimos eliminar el docente.");
      return;
    }
    setProfileOpen(false);
    setViewing(null);
    await refresh();
  }

  async function handleSaved(result: { teacherId: string; invitationCode?: string }) {
    await refresh();
    if (result.invitationCode) {
      const t = (await supabase.from("teachers").select("*").eq("id", result.teacherId).maybeSingle()).data;
      const { data: inv } = await supabase
        .from("teacher_invitations")
        .select("expires_at")
        .eq("teacher_id", result.teacherId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setCodeDialog({
        open: true,
        code: result.invitationCode,
        teacherName: t?.full_name ?? "",
        expiresAt: inv?.expires_at ?? null,
      });
    }
  }

  function showCodeFromProfile(code: string, expiresAt: string) {
    setCodeDialog({
      open: true,
      code,
      teacherName: viewing?.full_name ?? "",
      expiresAt,
    });
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
                <path d="M12 15l-5-5 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <Logo />
          </div>
          <p className="hidden text-sm font-medium text-foreground sm:block">{institutionName}</p>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-10">
        <div className="flex flex-col gap-1 animate-fade-in">
          <p className="text-sm font-medium text-primary">Docentes</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Gestión de docentes
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Registra, invita y organiza al equipo docente de tu institución.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs sm:grid-cols-[1fr_200px]">
          <div className="relative">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground">
              <path d="m17 17-3.5-3.5M15 9a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, correo o materia…"
              className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary"
            />
          </div>
          <SelectField
            label=""
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "", label: "Todos los estados" },
              { value: "pendiente", label: "Pendiente" },
              { value: "activo", label: "Activo" },
              { value: "inactivo", label: "Inactivo" },
            ]}
            className="!h-11"
          />
        </div>

        <section className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-card/60" />
              ))}
            </div>
          ) : teachers.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : filtered.length === 0 ? (
            <NoResults />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((t, idx) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openProfile(t)}
                  style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                  className="group flex animate-fade-in items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
                >
                  <TeacherAvatar photoPath={t.photo_url} name={t.full_name} className="h-12 w-12" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{t.full_name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {t.subjects?.length ? t.subjects.join(" · ") : t.email}
                    </p>
                    <span
                      className={
                        "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium " +
                        (t.status === "activo"
                          ? "bg-primary-soft text-primary"
                          : t.status === "pendiente"
                            ? "bg-warning/15 text-warning-foreground"
                            : "bg-muted text-muted-foreground")
                      }
                    >
                      <span className="h-1 w-1 rounded-full bg-current" />
                      {statusLabels[t.status] ?? t.status}
                    </span>
                  </div>
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary">
                    <path d="m8 5 5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      <button
        type="button"
        onClick={openCreate}
        className="fixed bottom-6 right-6 z-20 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:bg-primary-hover active:scale-95 sm:bottom-8 sm:right-8"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden>
          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Agregar docente
      </button>

      {institutionId && (
        <TeacherFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          institutionId={institutionId}
          teacher={editing}
          onSaved={handleSaved}
        />
      )}

      <TeacherProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        teacher={viewing}
        onEdit={openEditFromProfile}
        onDelete={handleDelete}
        onShowCode={showCodeFromProfile}
        deleting={deleting}
      />

      <InvitationCodeDialog
        open={codeDialog.open}
        onOpenChange={(open) => setCodeDialog((c) => ({ ...c, open }))}
        code={codeDialog.code}
        teacherName={codeDialog.teacherName}
        institutionName={institutionName}
        expiresAt={codeDialog.expiresAt}
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
            d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="mt-5 font-display text-lg font-semibold text-foreground">
        Aún no hay docentes
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
        Invita al primer docente de tu institución. Al crearlo se generará un código único
        de invitación que podrás compartir por correo o WhatsApp.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:bg-primary-hover"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Invitar al primero
      </button>
    </div>
  );
}

function NoResults() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center shadow-xs animate-fade-in">
      <h2 className="font-display text-base font-semibold text-foreground">Sin resultados</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Ajusta los filtros o revisa la búsqueda.
      </p>
    </div>
  );
}
