import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Role = "director" | "teacher" | "student";

interface State {
  loading: boolean;
  roles: Role[];
  isDirector: boolean;
  isTeacher: boolean;
  userId: string | null;
}

/** Hook para obtener el rol del usuario autenticado. */
export function useUserRole(): State {
  const [state, setState] = useState<State>({
    loading: true,
    roles: [],
    isDirector: false,
    isTeacher: false,
    userId: null,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (!uid) {
        if (!cancelled)
          setState({ loading: false, roles: [], isDirector: false, isTeacher: false, userId: null });
        return;
      }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      const roles = (data ?? []).map((r) => r.role) as Role[];
      if (!cancelled)
        setState({
          loading: false,
          roles,
          isDirector: roles.includes("director"),
          isTeacher: roles.includes("teacher"),
          userId: uid,
        });
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
