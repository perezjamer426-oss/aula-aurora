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
            Resumen en vivo de tu institución.
          </p>
        </div>

        {/* Widgets principales */}
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Estudiantes" value={stats?.total_students ?? 0} tone="primary" />
          <StatCard label="Docentes" value={stats?.total_teachers ?? 0} tone="primary" />
          <StatCard label="Aulas" value={stats?.total_classrooms ?? 0} tone="primary" />
          <StatCard
            label="Asistencia hoy"
            value={`${stats?.today_pct ?? 0}%`}
            hint={`${stats?.today_sessions ?? 0} aulas`}
            tone="primary"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Tardanzas hoy" value={stats?.today_late ?? 0} tone="warn" />
          <StatCard label="Ausencias hoy" value={stats?.today_absent ?? 0} tone="danger" />
          <StatCard
            label="Aulas pendientes"
            value={stats?.pending_classrooms ?? 0}
            hint="sin asistencia hoy"
            tone="warn"
          />
          <StatCard label="Institución" value={profile?.institution?.name ?? "—"} />
        </div>

        {/* Gráfico */}
        <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-semibold text-foreground">
                Asistencia últimos 7 días
              </h2>
              <p className="text-xs text-muted-foreground">
                Porcentaje de asistencia efectiva por día.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <AttendanceChart data={chart} />
          </div>
        </section>

        {/* Módulos */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Docentes", to: "/docentes", desc: "Invita y gestiona a tu equipo." },
            { label: "Estudiantes", to: "/estudiantes", desc: "Registra y organiza estudiantes." },
            { label: "Aulas", to: "/aulas", desc: "Crea aulas y asigna estudiantes." },
            { label: "Asistencia", to: "/asistencia", desc: "Supervisa la asistencia diaria." },
          ].map(({ label, to, desc }) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate({ to })}
              className="group rounded-2xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold text-foreground">{label}</h3>
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                  Abrir
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{desc}</p>
            </button>
          ))}
        </div>


      </main>
    </div>
  );
}
