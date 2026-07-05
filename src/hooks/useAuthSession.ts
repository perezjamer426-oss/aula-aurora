import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  session: Session | null;
  loading: boolean;
}

/** Hook cliente para observar la sesión actual. */
export function useAuthSession(): AuthState {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    let mounted = true;

    // 1) Suscripción a cambios ANTES de leer la sesión inicial.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState({ session, loading: false });
    });

    // 2) Sesión inicial.
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState({ session: data.session, loading: false });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
