import { cn } from "@/lib/utils";

export type AttendanceStatus = "presente" | "tardanza" | "ausente" | "justificado";

const config: Record<AttendanceStatus, { label: string; dot: string; bg: string; text: string }> = {
  presente: {
    label: "Presente",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
  },
  tardanza: {
    label: "Tardanza",
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-700",
  },
  ausente: {
    label: "Ausente",
    dot: "bg-rose-500",
    bg: "bg-rose-50",
    text: "text-rose-700",
  },
  justificado: {
    label: "Justificado",
    dot: "bg-sky-500",
    bg: "bg-sky-50",
    text: "text-sky-700",
  },
};

export function AttendanceStatusPill({
  status,
  size = "sm",
}: {
  status: AttendanceStatus;
  size?: "sm" | "md";
}) {
  const c = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        c.bg,
        c.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}

export const attendanceStatusLabels = config;
