import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Users, ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Hub "Personas" — reagrupa Docentes y Estudiantes en un único módulo
 * sin eliminar sus rutas originales.
 */
export const Route = createFileRoute("/_authenticated/personas")({
  component: PersonasHub,
});

function PersonasHub() {
  const navigate = useNavigate();
  const { isDirector, loading: roleLoading } = useUserRole();
  const [teacherCount, setTeacherCount] = useState<number | null>(null);
  const [studentCount, setStudentCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [{ count: tc }, { count: sc }] = await Promise.all([
        supabase.from("teachers").select("id", { count: "exact", head: true }),
        supabase.from("students").select("id", { count: "exact", head: true }),
      ]);
      setTeacherCount(tc ?? 0);
      setStudentCount(sc ?? 0);
    })();
  }, []);

  const cards = [
    {
      label: "Docentes",
      desc: "Invita, activa y gestiona a tu equipo docente.",
      icon: GraduationCap,
      to: "/docentes" as const,
      count: teacherCount,
      show: !roleLoading && isDirector,
    },
    {
      label: "Estudiantes",
      desc: "Registra estudiantes, edita perfiles y organiza secciones.",
      icon: Users,
      to: "/estudiantes" as const,
      count: studentCount,
      show: true,
    },
  ].filter((c) => c.show);

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
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-10 pb-16">
        <div>
          <p className="text-sm font-medium text-primary">Comunidad</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Personas
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Gestiona docentes y estudiantes desde un solo lugar.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cards.map(({ label, desc, icon: Icon, to, count }) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate({ to })}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 text-left shadow-[var(--shadow-sm)] transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
            >
              <span
                aria-hidden
                className="absolute inset-x-0 -top-16 h-32 bg-gradient-to-b from-primary/8 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
              />
              <div className="flex items-start justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-transform group-hover:scale-110">
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-foreground">
                {label}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground">
                {count ?? "—"}
                <span className="ml-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  registrados
                </span>
              </p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
