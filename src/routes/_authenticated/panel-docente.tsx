import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ClipboardCheck,
  History,
  Users,
  Bell,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/notifications/NotificationBell";

/** Panel del docente — rediseño premium. */
export const Route = createFileRoute("/_authenticated/panel-docente")({
  component: TeacherDashboard,
});

interface TeacherProfile {
  full_name: string;
  email: string;
  institution_name: string | null;
}

const modules = [
  {
    title: "Asistencia",
    description: "Toma asistencia rápida de tus aulas.",
    to: "/asistencia",
    icon: ClipboardCheck,
  },
  {
    title: "Historial",
    description: "Revisa la asistencia registrada.",
    to: "/asistencia-historial",
    icon: History,
  },
  {
    title: "Estudiantes",
    description: "Estudiantes de tus aulas.",
    to: "/estudiantes",
    icon: Users,
  },
  {
    title: "Notificaciones",
    description: "Actividad reciente de tu institución.",
    to: "/notificaciones",
    icon: Bell,
  },
];

function TeacherDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
    })();
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
  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <main className="mx-auto max-w-5xl px-5 pt-6 pb-16 sm:px-8 sm:pt-10">
      <div className="flex flex-wrap items-start justify-between gap-4 animate-fade-in-up">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/90">
            Panel del docente
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {loading ? "Cargando…" : firstName ? `Hola, ${firstName}` : "Hola"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            <span className="capitalize">{today}</span>
            {profile?.institution_name ? ` · ${profile.institution_name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-card px-3.5 text-xs font-medium text-foreground transition-all hover:border-primary/40 hover:text-primary disabled:opacity-60"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <section
        className="relative mt-8 overflow-hidden rounded-3xl border border-border/60 bg-gradient-hero p-6 text-white shadow-[var(--shadow-xl)] sm:p-8 animate-scale-in"
        style={{ animationDelay: "60ms" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl"
        />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white/90 backdrop-blur">
            <Sparkles className="h-3 w-3" />
            Tu día de hoy
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold sm:text-3xl">
            Registra la asistencia de tus aulas en segundos.
          </h2>
          <p className="mt-1 max-w-xl text-sm text-white/80">
            Selecciona un aula y marca presente, tardanza o ausente con un toque.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/asistencia" })}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            Tomar asistencia
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((m, i) => {
          const Icon = m.icon;
          return (
            <button
              key={m.title}
              type="button"
              onClick={() => navigate({ to: m.to })}
              style={{ animationDelay: `${120 + i * 60}ms` }}
              className="group relative animate-fade-in-up overflow-hidden rounded-3xl border border-border bg-card p-5 text-left shadow-[var(--shadow-sm)] transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-transform group-hover:scale-110">
                  <Icon className="h-4 w-4" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                {m.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
            </button>
          );
        })}
      </section>
    </main>
  );
}
