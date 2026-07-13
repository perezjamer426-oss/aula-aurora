import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  UsersRound,
  Users,
  School,
  ClipboardCheck,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AttendanceChart } from "@/components/attendance/AttendanceChart";
import { cn } from "@/lib/utils";

interface DirectorProfile {
  full_name: string;
  email: string;
  institution: { id: string; name: string; type: string; country: string | null } | null;
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

/** Centro de control — panel del director. */
export const Route = createFileRoute("/_authenticated/panel")({
  component: CentroDeControl,
});

function CentroDeControl() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DirectorProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
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

      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, institution:institutions(id, name, type, country)")
        .maybeSingle();
      if (cancelled) return;
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

      const [statsRes, chartRes] = await Promise.all([
        supabase.rpc("director_dashboard_stats"),
        supabase.rpc("attendance_last_7_days"),
      ]);
      if (cancelled) return;
      if (statsRes.data?.[0]) setStats(statsRes.data[0] as Stats);
      if (chartRes.data) setChart(chartRes.data as ChartPoint[]);
    })();
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
  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const alerts: Array<{ label: string; value: string; tone: "warn" | "danger" }> = [];
  if (stats?.pending_classrooms && stats.pending_classrooms > 0) {
    alerts.push({
      label: `${stats.pending_classrooms} aula${stats.pending_classrooms === 1 ? "" : "s"} sin asistencia hoy`,
      value: "Revisar",
      tone: "warn",
    });
  }
  if (stats?.today_absent && stats.today_absent > 0) {
    alerts.push({
      label: `${stats.today_absent} ausencia${stats.today_absent === 1 ? "" : "s"} registrada${stats.today_absent === 1 ? "" : "s"} hoy`,
      value: "Ver historial",
      tone: "danger",
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pt-6 pb-16 sm:px-8 sm:pt-10">
      {/* Header contextual */}
      <div className="flex flex-wrap items-start justify-between gap-4 animate-fade-in-up">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/90">
            Centro de control
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {loading ? "Cargando…" : firstName ? `Hola, ${firstName}` : "Hola"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            <span className="capitalize">{today}</span> · {profile?.institution?.name ?? "—"}
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

      {/* Hero card premium */}
      <section
        className="relative mt-8 overflow-hidden rounded-3xl border border-border/60 bg-gradient-hero p-6 text-white shadow-[var(--shadow-xl)] sm:p-8 animate-scale-in"
        style={{ animationDelay: "60ms" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white/90 backdrop-blur">
              <Sparkles className="h-3 w-3" />
              Resumen en vivo
            </div>
            <p className="mt-4 font-display text-5xl font-bold tracking-tight sm:text-6xl">
              {stats?.today_pct ?? 0}
              <span className="text-3xl font-semibold text-white/70">%</span>
            </p>
            <p className="mt-1 text-sm font-medium text-white/85">
              Asistencia efectiva hoy
            </p>
            <p className="mt-1 text-xs text-white/70">
              {stats?.today_sessions ?? 0} aula{(stats?.today_sessions ?? 0) === 1 ? "" : "s"} registrada{(stats?.today_sessions ?? 0) === 1 ? "" : "s"} · {stats?.today_late ?? 0} tardanza{(stats?.today_late ?? 0) === 1 ? "" : "s"} · {stats?.today_absent ?? 0} ausencia{(stats?.today_absent ?? 0) === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate({ to: "/asistencia" })}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              Tomar asistencia
              <ArrowUpRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/asistencia-historial" })}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition-all hover:bg-white/20"
            >
              Ver historial
            </button>
          </div>
        </div>
      </section>

      {/* KPIs — 4 tarjetas premium */}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Estudiantes"
          value={stats?.total_students ?? 0}
          delay={0}
        />
        <KpiCard
          icon={<UsersRound className="h-4 w-4" />}
          label="Docentes"
          value={stats?.total_teachers ?? 0}
          delay={60}
        />
        <KpiCard
          icon={<School className="h-4 w-4" />}
          label="Aulas"
          value={stats?.total_classrooms ?? 0}
          delay={120}
        />
        <KpiCard
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="Sesiones hoy"
          value={stats?.today_sessions ?? 0}
          delay={180}
        />
      </section>

      {/* Alertas + gráfico */}
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div
          className="lg:col-span-2 overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-sm)] animate-fade-in-up sm:p-6"
          style={{ animationDelay: "220ms" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
                Asistencia últimos 7 días
              </h2>
              <p className="text-xs text-muted-foreground">
                Porcentaje de asistencia efectiva por día.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <TrendingUp className="h-3 w-3" />
              7 días
            </span>
          </div>
          <div className="mt-4">
            <AttendanceChart data={chart} />
          </div>
        </div>

        <div
          className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-sm)] animate-fade-in-up sm:p-6"
          style={{ animationDelay: "280ms" }}
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <h2 className="font-display text-base font-semibold text-foreground">
              Atención
            </h2>
          </div>
          {alerts.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-muted/60 p-4 text-xs text-muted-foreground">
              Todo en orden. No hay alertas por revisar hoy.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {alerts.map((a, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-xs",
                    a.tone === "warn"
                      ? "border-amber-200/70 bg-amber-50/70 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100"
                      : "border-rose-200/70 bg-rose-50/70 text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100",
                  )}
                >
                  <span className="min-w-0 truncate font-medium">{a.label}</span>
                  <button
                    type="button"
                    onClick={() =>
                      navigate({ to: a.tone === "warn" ? "/asistencia" : "/asistencia-historial" })
                    }
                    className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground shadow-xs transition-all hover:bg-white dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                  >
                    {a.value}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Accesos rápidos */}
      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-sm font-semibold tracking-tight text-foreground">
            Accesos rápidos
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Personas",
              to: "/personas",
              desc: "Docentes y estudiantes en un solo módulo.",
              icon: UsersRound,
            },
            {
              label: "Aulas",
              to: "/aulas",
              desc: "Crea aulas, asigna estudiantes y evalúa el confort.",
              icon: School,
            },
            {
              label: "Asistencia",
              to: "/asistencia",
              desc: "Supervisa la asistencia diaria.",
              icon: ClipboardCheck,
            },
            {
              label: "Historial",
              to: "/asistencia-historial",
              desc: "Consulta y filtra sesiones anteriores.",
              icon: TrendingUp,
            },
          ].map(({ label, to, desc, icon: Icon }, i) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate({ to })}
              style={{ animationDelay: `${340 + i * 50}ms` }}
              className="group relative animate-fade-in-up overflow-hidden rounded-3xl border border-border bg-card p-5 text-left shadow-[var(--shadow-sm)] transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
            >
              <span
                aria-hidden
                className="absolute inset-x-0 -top-16 h-32 bg-gradient-to-b from-primary/8 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
              />
              <div className="flex items-center justify-between">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-transform group-hover:scale-110">
                  <Icon className="h-4 w-4" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                {label}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function KpiCard({
  icon,
  label,
  value,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  delay?: number;
}) {
  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-md)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft text-primary">
          {icon}
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}
