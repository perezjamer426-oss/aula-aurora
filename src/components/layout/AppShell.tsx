import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";

interface AppShellProps {
  children: ReactNode;
}

/**
 * Contenedor principal de la aplicación.
 * Aún no requiere autenticación — el módulo de sesión llegará después.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-radial-primary"
      />
      <header className="relative z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Logo />
          <div className="hidden items-center gap-2 sm:flex">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Versión preliminar
            </span>
          </div>
        </div>
      </header>
      <main className="relative z-10">{children}</main>
      <footer className="relative z-10 border-t border-border/60 mt-24">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} AureoSense. Todos los derechos reservados.</p>
          <p>Gestión educativa, diseñada con cuidado.</p>
        </div>
      </footer>
    </div>
  );
}
