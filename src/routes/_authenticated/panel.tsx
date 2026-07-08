import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { StatCard } from "@/components/dashboard/StatCard";
import { AttendanceChart } from "@/components/attendance/AttendanceChart";

interface DirectorProfile {
  full_name: string;
  email: string;
  institution: {
    id: string;
    name: string;
    type: string;
    country: string | null;
  } | null;
}

interface Stats {
  total_students: number;
  total_teachers: number;
  total_classrooms: number;
  today_sessions: number;
  today_pct: number;
  pending_classrooms: number;
  today_late: number;
  today_absent: number;
}

interface ChartPoint {
  day: string;
  attendance_pct: number;
  total_records: number;
}


/** Pantalla 5: Panel del director (vacío intencional). */
export const Route = createFileRoute("/_authenticated/panel")({
  component: DirectorDashboard,
});

function DirectorDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DirectorProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;

      // Comprobar rol: si es docente, redirigir a su panel.
      if (uid) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);
        const rolesList = (roles ?? []).map((r) => r.role);
        if (!rolesList.includes("director") && rolesList.includes("teacher")) {
          navigate({ to: "/panel-docente", replace: true });
          return;
        }
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "full_name, email, institution:institutions(id, name, type, country)",
        )
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }
      setProfile(
        data
          ? {
              full_name: data.full_name,
              email: data.email,
              institution: Array.isArray(data.institution)
                ? (data.institution[0] ?? null)
                : (data.institution ?? null),
            }
          : null,
      );
      setLoading(false);

      // Cargar estadísticas y gráfico en paralelo
      const [statsRes, chartRes] = await Promise.all([
        supabase.rpc("director_dashboard_stats"),
        supabase.rpc("attendance_last_7_days"),
      ]);
      if (cancelled) return;
      if (statsRes.data?.[0]) setStats(statsRes.data[0] as Stats);
      if (chartRes.data) setChart(chartRes.data as ChartPoint[]);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    navigate({ to: "/iniciar-sesion", replace: true });
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-radial-primary"
      />

      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">
                {profile?.institution?.name ?? "Cargando…"}
              </p>
              <p className="text-xs text-muted-foreground">
                {profile?.full_name ?? profile?.email ?? ""}
              </p>
            </div>
            <NotificationBell />
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
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-primary">Panel del director</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {loading
              ? "Cargando…"
              : firstName
                ? `Hola, ${firstName}`
                : "Hola"}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Este es el punto de partida de tu institución. Aún no hay nada aquí —
            los módulos aparecerán conforme los construyamos, paso a paso.
          </p>
        </div>

        {/* Estado vacío intencional — no hay datos, ni de ejemplo. */}
        <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2 className="mt-5 font-display text-lg font-semibold text-foreground">
            Tu institución está lista
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            {profile?.institution?.name
              ? `«${profile.institution.name}» está creada y vacía. Los módulos de profesores, estudiantes y asistencia se activarán próximamente.`
              : "Los módulos se activarán próximamente."}
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Profesores", to: "/docentes" as string | null, desc: "Invita y gestiona a tu equipo docente." },
            { label: "Estudiantes", to: "/estudiantes", desc: "Registra, busca y organiza a los estudiantes." },
            { label: "Asistencia", to: null, desc: "Este módulo estará disponible en un próximo paso." },
          ].map(({ label, to, desc }) => {
            const enabled = Boolean(to);
            const content = (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold text-foreground">
                    {label}
                  </h3>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider " +
                      (enabled
                        ? "bg-primary-soft text-primary"
                        : "bg-muted text-muted-foreground")
                    }
                  >
                    {enabled ? "Abrir" : "Próximamente"}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{desc}</p>
              </>
            );
            return enabled ? (
              <button
                key={label}
                type="button"
                onClick={() => navigate({ to: to! })}
                className="group rounded-2xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
              >
                {content}
              </button>
            ) : (
              <article
                key={label}
                className="rounded-2xl border border-border bg-card p-5 opacity-70"
              >
                {content}
              </article>
            );
          })}
        </div>

      </main>
    </div>
  );
}
