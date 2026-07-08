import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notificaciones")({
  component: NotificationsScreen,
});

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

const typeIcons: Record<string, { icon: string; tone: string }> = {
  attendance_taken: { icon: "✓", tone: "bg-primary-soft text-primary" },
  student_registered: { icon: "🎓", tone: "bg-sky-50 text-sky-700" },
  teacher_joined: { icon: "👋", tone: "bg-amber-50 text-amber-700" },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function NotificationsScreen() {
  const navigate = useNavigate();
  const { isDirector } = useUserRole();
  const [rows, setRows] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, body, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error("No se pudieron cargar las notificaciones");
      setLoading(false);
      return;
    }
    setRows(data as Notif[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function markAllRead() {
    const unreadIds = rows.filter((r) => !r.read_at).map((r) => r.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
    toast.success("Todas marcadas como leídas");
    load();
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-radial-primary"
      />
      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo />
          <button
            type="button"
            onClick={() =>
              navigate({ to: isDirector ? "/panel" : "/panel-docente" })
            }
            className="inline-flex h-9 items-center rounded-full border border-border bg-background px-3.5 text-xs font-medium hover:bg-accent"
          >
            ← Panel
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 pt-10 pb-16">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-primary">Notificaciones</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Actividad reciente
            </h1>
          </div>
          {rows.some((r) => !r.read_at) && (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex h-9 items-center rounded-full border border-border bg-background px-3.5 text-xs font-medium hover:bg-accent"
            >
              Marcar todo leído
            </button>
          )}
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-card" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="Sin notificaciones"
              description="Cuando ocurra actividad en tu institución, aparecerá aquí."
            />
          ) : (
            <ul className="space-y-2">
              {rows.map((n) => {
                const cfg = typeIcons[n.type] ?? {
                  icon: "•",
                  tone: "bg-muted text-foreground",
                };
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs transition-colors",
                      !n.read_at && "border-primary/30 bg-primary-soft/30",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
                        cfg.tone,
                      )}
                    >
                      {cfg.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{n.title}</p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatTime(n.created_at)}
                        </span>
                      </div>
                      {n.body && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                      )}
                    </div>
                    {!n.read_at && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
