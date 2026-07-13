import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  UsersRound,
  School,
  ClipboardCheck,
  Bell,
  History,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Array<"director" | "teacher">;
}

const NAV: NavItem[] = [
  { to: "/panel", label: "Centro de control", icon: LayoutDashboard, roles: ["director"] },
  { to: "/panel-docente", label: "Mi panel", icon: LayoutDashboard, roles: ["teacher"] },
  { to: "/personas", label: "Personas", icon: UsersRound, roles: ["director", "teacher"] },
  { to: "/aulas", label: "Aulas", icon: School, roles: ["director"] },
  { to: "/asistencia", label: "Asistencia", icon: ClipboardCheck, roles: ["director", "teacher"] },
  { to: "/asistencia-historial", label: "Historial", icon: History, roles: ["director", "teacher"] },
  { to: "/notificaciones", label: "Notificaciones", icon: Bell, roles: ["director", "teacher"] },
];

/**
 * Shell de navegación híbrido:
 * - Desktop: sidebar fija a la izquierda (240px).
 * - Móvil: bottom navigation bar con los 4 accesos principales.
 * No modifica los encabezados internos de cada pantalla.
 */
export function AppNavigation({ children }: { children: ReactNode }) {
  const { isDirector, isTeacher, loading } = useUserRole();
  const items = NAV.filter((n) => {
    if (loading) return n.roles.includes("director"); // fallback amable
    if (isDirector) return n.roles.includes("director");
    if (isTeacher) return n.roles.includes("teacher");
    return false;
  });

  // Prioridad para móvil (máx 5)
  const mobileItems = items.slice(0, 5);

  return (
    <div className="relative min-h-screen bg-background">
      {/* Fondo decorativo global */}
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-mesh opacity-70" />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-radial-primary"
      />

      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 shrink-0 border-r border-border/60 bg-surface/60 backdrop-blur-xl md:flex md:flex-col">
        <div className="px-5 pt-5 pb-4">
          <Logo />
        </div>
        <nav className="flex-1 space-y-0.5 px-3 pb-4">
          {items.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>
        <div className="border-t border-border/60 px-3 py-3">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card/60 px-3 py-2">
            <div className="min-w-0">
              <SessionMini />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Contenido */}
      <div className="relative z-10 md:pl-60">
        {/* Barra superior compacta solo en móvil (theme toggle + campana) */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/70 px-4 py-2.5 backdrop-blur-xl md:hidden">
          <Logo />
          <ThemeToggle />
        </div>

        <div className="pb-24 md:pb-8">{children}</div>
      </div>

      {/* Bottom nav móvil */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/85 backdrop-blur-xl md:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {mobileItems.map((item) => (
            <li key={item.to}>
              <BottomLink item={item} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  const { pathname } = useLocation();
  const active = pathname === item.to || pathname.startsWith(item.to + "/");
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
        active
          ? "bg-primary-soft text-primary shadow-xs"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
      <span className="truncate">{item.label}</span>
      {active && (
        <span
          aria-hidden
          className="absolute inset-y-2 right-2 w-1 rounded-full bg-primary/70"
        />
      )}
    </Link>
  );
}

function BottomLink({ item }: { item: NavItem }) {
  const { pathname } = useLocation();
  const active = pathname === item.to || pathname.startsWith(item.to + "/");
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="truncate">{item.label.split(" ")[0]}</span>
    </Link>
  );
}

function SessionMini() {
  const [name, setName] = useState<string>("");
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, email")
        .maybeSingle();
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      let r = "";
      if (uid) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);
        const list = (roles ?? []).map((x) => x.role);
        r = list.includes("director") ? "Director" : list.includes("teacher") ? "Docente" : "";
      }
      if (cancelled) return;
      setName(p?.full_name || p?.email || "");
      setRole(r);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-w-0">
      <p className="truncate text-xs font-semibold text-foreground">{name || "Cuenta"}</p>
      <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
        {role || "AureoSense"}
      </p>
    </div>
  );
}
