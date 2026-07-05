import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Field } from "@/components/form/Field";
import { ActionButton } from "@/components/ui/action-button";
import { supabase } from "@/integrations/supabase/client";
import { loginSchema } from "@/lib/validation";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

/** Pantalla 3: Iniciar sesión. */
export const Route = createFileRoute("/iniciar-sesion")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Iniciar sesión — AureoSense" },
      {
        name: "description",
        content: "Accede a tu cuenta de AureoSense para gestionar tu institución.",
      },
    ],
  }),
  component: LoginScreen,
});

function LoginScreen() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/iniciar-sesion" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"email" | "password" | "form", string>>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "email" | "password";
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);

    if (error) {
      setErrors({
        form:
          error.message.toLowerCase().includes("invalid")
            ? "Correo o contraseña incorrectos."
            : "No pudimos iniciar sesión. Inténtalo de nuevo.",
      });
      return;
    }

    const isSafe = typeof redirect === "string" && redirect.startsWith("/");
    navigate({ to: isSafe ? redirect : "/panel", replace: true });
  }

  return (
    <AuthLayout
      title="Bienvenido de nuevo"
      subtitle="Ingresa a tu institución en AureoSense."
      footer={
        <>
          ¿Aún no tienes cuenta?{" "}
          <Link to="/registrar-institucion" className="font-medium text-primary hover:underline">
            Registrar institución
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
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
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />

        {errors.form && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
          >
            {errors.form}
          </div>
        )}

        <ActionButton type="submit" size="lg" fullWidth loading={loading}>
          Iniciar sesión
        </ActionButton>
      </form>
    </AuthLayout>
  );
}
