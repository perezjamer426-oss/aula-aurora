import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
}

/** Layout centrado para pantallas de autenticación. */
export function AuthLayout({ title, subtitle, footer, children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-radial-primary"
      />
      <header className="relative z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/bienvenida" aria-label="Ir al inicio">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-col px-6 pt-6 pb-16">
        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground text-balance">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-muted-foreground text-balance">{subtitle}</p>
          )}
        </div>

        <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-lg sm:p-8">
          {children}
        </div>

        {footer && (
          <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        )}
      </main>
    </div>
  );
}
