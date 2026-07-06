import { ActionButton } from "@/components/ui/action-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StudentAvatar } from "./StudentAvatar";
import type { StudentRow } from "./StudentFormDialog";

interface StudentProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentRow | null;
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground">{value?.trim() ? value : "—"}</span>
    </div>
  );
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Ficha del estudiante con acciones de editar y eliminar. */
export function StudentProfileDialog({
  open,
  onOpenChange,
  student,
  onEdit,
  onDelete,
  deleting,
}: StudentProfileDialogProps) {
  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="sr-only">Perfil del estudiante</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 pb-2 pt-2 text-center">
          <StudentAvatar
            photoPath={student.photo_url}
            name={student.full_name}
            className="h-20 w-20 text-lg ring-4 ring-primary-soft"
          />
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              {student.full_name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {student.grade} · Sección {student.section}
            </p>
          </div>
          <span
            className={
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium " +
              (student.status === "activo"
                ? "bg-primary-soft text-primary"
                : "bg-muted text-muted-foreground")
            }
          >
            <span
              className={
                "h-1.5 w-1.5 rounded-full " +
                (student.status === "activo" ? "bg-primary" : "bg-muted-foreground")
              }
            />
            {student.status === "activo" ? "Activo" : "Inactivo"}
          </span>
        </div>

        <div className="grid grid-cols-1 divide-y divide-border rounded-2xl border border-border bg-card px-4 sm:grid-cols-2 sm:divide-y-0 sm:[&>*]:border-b sm:[&>*]:border-border">
          <InfoRow label="DNI" value={student.dni} />
          <InfoRow label="Fecha de nacimiento" value={formatDate(student.birth_date)} />
          <InfoRow label="Apoderado" value={student.guardian_name} />
          <InfoRow label="Teléfono" value={student.phone} />
          <InfoRow label="Correo" value={student.email} />
          <InfoRow label="Grado y sección" value={`${student.grade} · ${student.section}`} />
        </div>

        <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
          <ActionButton
            variant="secondary"
            onClick={onDelete}
            loading={deleting}
            className="text-destructive hover:bg-destructive/5"
          >
            Eliminar
          </ActionButton>
          <ActionButton onClick={onEdit}>Editar</ActionButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
