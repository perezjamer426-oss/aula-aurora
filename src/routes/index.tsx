import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";

/**
 * Pantalla 1: Splash.
 * Marca de bienvenida breve; decide destino según la sesión.
 */
export const Route = createFileRoute("/")({
  component: SplashScreen,
});

function SplashScreen() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const minDelay = new Promise((r) => setTimeout(r, 900));

    Promise.all([supabase.auth.getSession(), minDelay]).then(([{ data }]) => {
      if (cancelled) return;
      setReady(true);
      const target = data.session ? "/panel" : "/bienvenida";
      // Pequeño respiro visual antes de navegar.
      setTimeout(() => {
        if (!cancelled) navigate({ to: target, replace: true });
      }, 200);
    });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-radial-primary"
      />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="animate-in fade-in zoom-in-95 duration-700">
          <Logo />
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full bg-primary transition-opacity ${
              ready ? "opacity-100" : "animate-pulse opacity-60"
            }`}
          />
          Preparando tu espacio…
        </div>
      </div>
    </div>
  );
}
