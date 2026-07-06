import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import welcomeIllustration from "@/assets/welcome-illustration.png";

/** Pantalla 2: Bienvenida pública. */
export const Route = createFileRoute("/bienvenida")({
  head: () => ({
    meta: [
      { title: "Bienvenido a AureoSense" },
      {
        name: "description",
        content:
          "AureoSense es la plataforma minimalista para administrar tu escuela: crea tu institución y comienza desde cero.",
      },
    ],
  }),
  component: WelcomeScreen,
});

const features = [
  {
    title: "Comienza vacío",
    description:
      "Sin plantillas ni datos de ejemplo. Tú creas cada escuela, cada maestro y cada estudiante desde el primer día.",
  },
  {
    title: "Diseño pensado",
    description:
      "Una interfaz cuidada al detalle. Navegación clara, acciones evidentes y una experiencia que no distrae.",
  },
  {
    title: "Control total",
    description:
      "Como director, decides quién entra, qué ven y qué pueden hacer. La administración vuelve a tus manos.",
  },
  {
    title: "Listo para crecer",
    description:
      "Profesores, estudiantes y asistencia. Un módulo a la vez, sin prisa y sin límites.",
  },
];

function WelcomeScreen() {
  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-6 pt-10 pb-4 text-center sm:pt-16">
        <div className="mx-auto mb-10 max-w-2xl">
          <img
            src={welcomeIllustration}
            alt="Ilustración de una escuela moderna"
            width={1024}
            height={640}
            className="w-full rounded-2xl"
            loading="eager"
          />
        </div>

        <h1 className="mx-auto max-w-2xl font-display text-4xl font-semibold tracking-tight text-foreground text-balance sm:text-5xl">
          Tu escuela,{" "}
          <span className="text-primary">organizada con elegancia.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground text-balance">
          Crea tu institución desde cero, invita a tu equipo y gestiona todo con
          la simplicidad que tu día merece.
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 py-10 sm:grid-cols-2">
        {features.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-border bg-card p-6 text-left shadow-xs transition-shadow hover:shadow-md"
          >
            <div className="mb-3 h-8 w-8 rounded-lg bg-primary-soft" />
            <h3 className="font-display text-base font-semibold text-foreground">
              {item.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-md px-6 pb-16 text-center">
        <Link
          to="/registrar-institucion"
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:bg-primary-hover active:scale-[0.98]"
        >
          Crear mi institución
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden>
            <path
              d="M4.5 10h11m0 0-4-4m4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        <p className="mt-6 text-sm text-muted-foreground">
          ¿Ya tienes una cuenta?{" "}
          <Link
            to="/iniciar-sesion"
            className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
          >
            Iniciar sesión
          </Link>
        </p>
      </section>
    </AppShell>
  );
}
