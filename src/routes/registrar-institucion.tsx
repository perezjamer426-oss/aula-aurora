import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Field } from "@/components/form/Field";
import { SelectField } from "@/components/form/SelectField";
import { ActionButton } from "@/components/ui/action-button";
import { supabase } from "@/integrations/supabase/client";
import {
  institutionTypes,
  registerSchema,
  type RegisterInput,
} from "@/lib/validation";

/** Pantalla 4: Registrar institución (crea director + institución). */
export const Route = createFileRoute("/registrar-institucion")({
  head: () => ({
    meta: [
      { title: "Registrar institución — AureoSense" },
      {
        name: "description",
        content: "Crea tu institución en AureoSense y comienza desde cero.",
      },
    ],
  }),
  component: RegisterScreen,
});

type FormValues = Omit<RegisterInput, "institutionType"> & {
  institutionType: RegisterInput["institutionType"];
};

const initialValues: FormValues = {
  fullName: "",
  email: "",
  password: "",
  institutionName: "",
  institutionPhone: "",
  institutionAddress: "",
  institutionCountry: "",
  institutionType: "primaria",
};

function RegisterScreen() {
  const navigate = useNavigate();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues | "form", string>>>({});
  const [loading, setLoading] = useState(false);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormValues;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    // 1) Crear usuario en Auth.
    const { data: signUp, error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
        data: { full_name: parsed.data.fullName },
      },
    });

    if (signUpError) {
      setLoading(false);
      setErrors({
        form: signUpError.message.toLowerCase().includes("already")
          ? "Este correo ya está registrado. Inicia sesión."
          : "No pudimos crear la cuenta. Inténtalo de nuevo.",
      });
      return;
    }

    // 2) Asegurar sesión (auto-confirm activo).
    if (!signUp.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (signInError) {
        setLoading(false);
        setErrors({
          form:
            "Tu cuenta fue creada. Inicia sesión para continuar el registro de la institución.",
        });
        return;
      }
    }

    // 3) Crear institución + rol director de forma atómica.
    const { error: rpcError } = await supabase.rpc("register_director_institution", {
      _full_name: parsed.data.fullName,
      _institution_name: parsed.data.institutionName,
      _institution_phone: parsed.data.institutionPhone ?? "",
      _institution_address: parsed.data.institutionAddress ?? "",
      _institution_country: parsed.data.institutionCountry ?? "",
      _institution_type: parsed.data.institutionType,
    });

    setLoading(false);

    if (rpcError) {
      setErrors({
        form:
          rpcError.message ||
          "No pudimos registrar la institución. Inténtalo de nuevo.",
      });
      return;
    }

    navigate({ to: "/panel", replace: true });
  }

  return (
    <AuthLayout
      title="Registra tu institución"
      subtitle="Tú serás el director. Todo comienza desde cero."
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
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Director
          </p>
          <Field
            label="Nombre completo"
            autoComplete="name"
            placeholder="Nombre y apellidos"
            value={values.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            error={errors.fullName}
            required
          />
          <Field
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            placeholder="tú@escuela.com"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            error={errors.email}
            required
          />
          <Field
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            value={values.password}
            onChange={(e) => set("password", e.target.value)}
            error={errors.password}
            hint="Al menos 8 caracteres."
            required
          />
        </div>

        <div className="my-2 h-px w-full bg-border" />

        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Institución
          </p>
          <Field
            label="Nombre de la institución"
            placeholder="Colegio San Martín"
            value={values.institutionName}
            onChange={(e) => set("institutionName", e.target.value)}
            error={errors.institutionName}
            required
          />
          <SelectField
            label="Tipo"
            value={values.institutionType}
            onChange={(e) =>
              set("institutionType", e.target.value as FormValues["institutionType"])
            }
            options={institutionTypes as unknown as { value: string; label: string }[]}
            error={errors.institutionType as string | undefined}
          />
          <Field
            label="Teléfono"
            type="tel"
            autoComplete="tel"
            placeholder="+52 55 0000 0000"
            value={values.institutionPhone ?? ""}
            onChange={(e) => set("institutionPhone", e.target.value)}
            error={errors.institutionPhone}
            optional
          />
          <Field
            label="Dirección"
            autoComplete="street-address"
            placeholder="Calle, número, colonia"
            value={values.institutionAddress ?? ""}
            onChange={(e) => set("institutionAddress", e.target.value)}
            error={errors.institutionAddress}
            optional
          />
          <Field
            label="País"
            autoComplete="country-name"
            placeholder="México"
            value={values.institutionCountry ?? ""}
            onChange={(e) => set("institutionCountry", e.target.value)}
            error={errors.institutionCountry}
            optional
          />
        </div>

        {errors.form && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
          >
            {errors.form}
          </div>
        )}

        <ActionButton type="submit" size="lg" fullWidth loading={loading}>
          Crear institución
        </ActionButton>

        <p className="text-center text-xs text-muted-foreground">
          Al crear tu institución aceptas los términos de uso de AureoSense.
        </p>
      </form>
    </AuthLayout>
  );
}
