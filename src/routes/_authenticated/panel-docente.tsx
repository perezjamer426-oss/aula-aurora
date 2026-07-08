import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";

/** Panel del docente — vista con módulos vacíos. */
export const Route = createFileRoute("/_authenticated/panel-docente")({
  component: TeacherDashboard,
});

interface TeacherProfile {
  full_name: string;
  email: string;
  institution_name: string | null;
}

const modules: Array<{
  title: string;
  description: string;
  to: string | null;
}> = [
  { title: "Asistencia", description: "Toma asistencia rápida de tus aulas.", to: "/asistencia" },
  { title: "Historial", description: "Revisa la asistencia registrada.", to: "/asistencia-historial" },
  { title: "Estudiantes", description: "Estudiantes de tus aulas.", to: "/estudiantes" },
  { title: "Notificaciones", description: "Actividad reciente de tu institución.", to: "/notificaciones" },
];

function TeacherDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, institution:institutions(name)")
        .maybeSingle();
      if (cancelled) return;
      const inst = Array.isArray(data?.institution)
        ? data?.institution[0]
        : (data?.institution as { name?: string } | null);
      setProfile({
        full_name: data?.full_name ?? "",
        email: data?.email ?? "",
        institution_name: inst?.name ?? null,
      });
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    navigate({ to: "/iniciar-sesion", replace: true });
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  return (
    <div className="relative min-h-screen bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-radial-primary" />

      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">
                {profile?.institution_name ?? "Cargando…"}
              </p>
              <p className="text-xs text-muted-foreground">
                {profile?.full_name ?? profile?.email ?? ""} · Docente
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-10 pb-16">
        <div className="flex flex-col gap-1 animate-fade-in">
          <p className="text-sm font-medium text-primary">Panel del docente</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {loading ? "Cargando…" : firstName ? `Hola, ${firstName}` : "Hola"}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Aquí verás tus clases, horario y estudiantes cuando el director te asigne aulas.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m, idx) => (
            <button
              key={m.title}
              type="button"
              onClick={() => m.to && navigate({ to: m.to })}
              disabled={!m.to}
              style={{ animationDelay: `${idx * 40}ms` }}
              className="group relative animate-fade-in rounded-2xl border border-border bg-card p-5 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-display text-sm font-semibold text-foreground">
                  {m.title}
                </h3>
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                  Abrir
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{m.description}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
