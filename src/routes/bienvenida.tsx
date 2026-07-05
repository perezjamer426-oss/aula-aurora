import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

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

function WelcomeScreen() {
  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-6 pt-14 pb-16 text-center sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Gestión educativa premium
        </span>

        <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-foreground text-balance sm:text-6xl">
          Tu escuela,{" "}
          <span className="text-primary">organizada con elegancia.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground text-balance sm:text-lg">
          Crea tu institución desde cero, invita a tu equipo y gestiona todo con
          la simplicidad que tu día merece. Sin plantillas ni datos de ejemplo.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/registrar-institucion"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 text-[15px] font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:bg-primary-hover active:scale-[0.98]"
          >
            Crear mi institución
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
              <path
                d="M4.5 10h11m0 0-4-4m4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <Link
            to="/iniciar-sesion"
            className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-background px-7 text-[15px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ya tengo cuenta
          </Link>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Al continuar aceptas los términos de uso de AureoSense.
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-4 sm:grid-cols-3">
        {[
          {
            title: "Comienza vacío",
            description:
              "Nada de datos de ejemplo. Tú creas tu institución, tu equipo y tu ritmo.",
          },
          {
            title: "Diseño premium",
            description:
              "Una experiencia cuidada al detalle, pensada para el día a día escolar.",
          },
          {
            title: "Listo para crecer",
            description:
              "Base sólida para profesores, estudiantes y asistencia. Un módulo a la vez.",
          },
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-border bg-card p-5 text-left shadow-xs transition-shadow hover:shadow-md"
          >
            <div className="mb-3 h-8 w-8 rounded-lg bg-primary-soft" />
            <h3 className="font-display text-base font-semibold text-foreground">
              {item.title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
