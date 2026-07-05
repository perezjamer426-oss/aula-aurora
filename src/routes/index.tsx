import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-24 text-center sm:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Plataforma en construcción
        </span>

        <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-foreground text-balance sm:text-6xl">
          Gestión escolar,{" "}
          <span className="text-primary">simple y elegante.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground text-balance sm:text-lg">
          AureoSense es la plataforma minimalista para administrar tu escuela:
          profesores, estudiantes y asistencia en un solo lugar. Sin plantillas,
          sin datos de ejemplo — tú creas todo desde cero.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            disabled
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            Comenzar
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
              <path
                d="M4.5 10h11m0 0-4-4m4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            disabled
            className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            Conocer más
          </button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          El acceso se habilitará con el siguiente módulo.
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-8 sm:grid-cols-3">
        {[
          {
            title: "Escuelas",
            description: "Crea y organiza tu institución desde cero.",
            icon: (
              <path
                d="M4 10 12 4l8 6v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            ),
          },
          {
            title: "Personas",
            description: "Profesores y estudiantes, gestionados con claridad.",
            icon: (
              <>
                <circle cx="9" cy="9" r="3.25" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M3.5 19c.75-3 3-4.5 5.5-4.5s4.75 1.5 5.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <circle cx="17" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.6" />
              </>
            ),
          },
          {
            title: "Asistencia",
            description: "Registra y consulta la asistencia sin fricción.",
            icon: (
              <>
                <rect
                  x="4"
                  y="5"
                  width="16"
                  height="15"
                  rx="2.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path
                  d="m9.5 14.5 2 2 3.5-4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            ),
          },
        ].map((item) => (
          <article
            key={item.title}
            className="group rounded-2xl border border-border bg-card p-5 shadow-xs transition-shadow hover:shadow-md"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
                {item.icon}
              </svg>
            </div>
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
