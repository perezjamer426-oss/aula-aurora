import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Layout de rutas privadas. `ssr: false` porque la sesión de Supabase
 * vive en localStorage y no está disponible en el servidor.
 * Redirige a /iniciar-sesion cuando no hay sesión.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/iniciar-sesion",
        search: { redirect: location.href },
      });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
