import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Field } from "@/components/form/Field";
import { ActionButton } from "@/components/ui/action-button";
import { supabase } from "@/integrations/supabase/client";
import { teacherSignupSchema } from "@/lib/validation";

const searchSchema = z.object({
  code: z.string().optional(),
});

/** Registro de docente por código de invitación. */
export const Route = createFileRoute("/registrar-docente")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Registro de docente — AureoSense" },
      {
        name: "description",
        content: "Únete a tu institución en AureoSense con el código de invitación.",
      },
    ],
  }),
  component: TeacherSignupScreen,
});

type Preview =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "valid"; institution: string; teacher: string; expiresAt: string }
  | { status: "invalid" | "used" | "expired"; message: string };

function TeacherSignupScreen() {
  const navigate = useNavigate();
  const { code: initialCode } = useSearch({ from: "/registrar-docente" });
  const [code, setCode] = useState(initialCode ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"code" | "email" | "password" | "confirmPassword" | "form", string>>>({});
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview>({ status: "idle" });

  // Validación en vivo del código.
  useEffect(() => {
    const trimmed = code.trim();
    if (!trimmed || trimmed.length < 6) {
      setPreview({ status: "idle" });
      return;
    }
    let cancelled = false;
    setPreview({ status: "checking" });
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc("preview_teacher_invitation", { _code: trimmed });
      if (cancelled) return;
      if (error) {
        setPreview({ status: "invalid", message: "No pudimos validar el código." });
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || row.status === "invalid") {
        setPreview({ status: "invalid", message: "Código no válido." });
      } else if (row.status === "used") {
        setPreview({ status: "used", message: "Este código ya fue utilizado." });
      } else if (row.status === "expired") {
        setPreview({ status: "expired", message: "Este código ha expirado. Pide al director uno nuevo." });
      } else {
        setPreview({
          status: "valid",
          institution: row.institution_name ?? "",
          teacher: row.teacher_name ?? "",
          expiresAt: row.expires_at,
        });
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [code]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = teacherSignupSchema.safeParse({ code, email, password, confirmPassword });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "code" | "email" | "password" | "confirmPassword";
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    if (preview.status !== "valid") {
      setErrors({
        form:
          preview.status === "expired" || preview.status === "used" || preview.status === "invalid"
            ? (preview as { message: string }).message
            : "Valida el código antes de continuar.",
      });
      return;
    }

    setLoading(true);
    const normalizedCode = parsed.data.code.trim().toUpperCase();

    // 1) Sign up
    const { data: signUp, error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });

    if (signUpError) {
      setLoading(false);
      setErrors({
        form: signUpError.message.toLowerCase().includes("already")
          ? "Este correo ya está registrado. Inicia sesión."
          : "No pudimos crear tu cuenta. Inténtalo de nuevo.",
      });
      return;
    }

    // 2) Asegurar sesión
    if (!signUp.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (signInError) {
        setLoading(false);
        setErrors({
          form: "Tu cuenta fue creada. Inicia sesión para completar el registro.",
        });
        return;
      }
    }

    // 3) Canjear código
    const { error: rpcError } = await supabase.rpc("redeem_teacher_invitation", {
      _code: normalizedCode,
    });

    setLoading(false);
    if (rpcError) {
      setErrors({ form: rpcError.message });
      return;
    }

    navigate({ to: "/panel-docente", replace: true });
  }

  return (
    <AuthLayout
      title="Únete como docente"
      subtitle="Ingresa el código de invitación que te compartió el director."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link to="/iniciar-sesion" className="font-medium text-primary hover:underline">
            Iniciar sesión
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field
          label="Código de invitación"
          placeholder="AUR-00000-XXXXX"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          error={errors.code}
          required
          autoComplete="off"
        />

        {preview.status === "checking" && (
          <p className="text-xs text-muted-foreground">Validando código…</p>
        )}
        {preview.status === "valid" && (
          <div className="rounded-xl border border-primary/30 bg-primary-soft/40 p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-primary/80">
              Invitación válida
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{preview.teacher}</p>
            <p className="text-xs text-muted-foreground">
              Se unirá a <span className="font-medium text-foreground">{preview.institution}</span>
            </p>
          </div>
        )}
        {(preview.status === "invalid" || preview.status === "used" || preview.status === "expired") && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs font-medium text-destructive">
            {preview.message}
          </div>
        )}

        <Field
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="tú@escuela.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <Field
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <Field
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="Repite tu contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          required
        />

        {errors.form && (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
            {errors.form}
          </div>
        )}

        <ActionButton
          type="submit"
          size="lg"
          fullWidth
          loading={loading}
          disabled={preview.status !== "valid"}
        >
          Crear mi cuenta
        </ActionButton>

        <p className="text-center text-xs text-muted-foreground">
          Al continuar aceptas los términos de uso de AureoSense.
        </p>
      </form>
    </AuthLayout>
  );
}
