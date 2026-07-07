import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionButton } from "@/components/ui/action-button";
import { TeacherAvatar } from "./TeacherAvatar";
import { supabase } from "@/integrations/supabase/client";
import type { TeacherRow } from "./TeacherFormDialog";

interface TeacherProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: TeacherRow | null;
  onEdit: () => void;
  onDelete: () => void;
  onShowCode: (code: string, expiresAt: string) => void;
  deleting: boolean;
}

const statusStyles: Record<string, { label: string; className: string }> = {
  pendiente: {
    label: "Pendiente",
    className: "bg-warning/15 text-warning-foreground",
  },
  activo: {
    label: "Activo",
    className: "bg-primary-soft text-primary",
  },
  inactivo: {
    label: "Inactivo",
    className: "bg-muted text-muted-foreground",
  },
};

export function TeacherProfileDialog({
  open,
  onOpenChange,
  teacher,
  onEdit,
  onDelete,
  onShowCode,
  deleting,
}: TeacherProfileDialogProps) {
  const [activeCode, setActiveCode] = useState<{ code: string; expires_at: string } | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setActiveCode(null);
    if (!open || !teacher || teacher.user_id) return;
    supabase
      .from("teacher_invitations")
      .select("code, expires_at, used_at")
      .eq("teacher_id", teacher.id)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data && new Date(data.expires_at) > new Date()) {
          setActiveCode({ code: data.code, expires_at: data.expires_at });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, teacher]);

  async function handleRegenerate() {
    if (!teacher) return;
    setRegenerating(true);
    const { data, error } = await supabase.rpc("regenerate_teacher_invitation", {
      _teacher_id: teacher.id,
    });
    setRegenerating(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.invitation_code && row?.expires_at) {
      setActiveCode({ code: row.invitation_code, expires_at: row.expires_at });
      onShowCode(row.invitation_code, row.expires_at);
    }
  }

  if (!teacher) return null;
  const status = statusStyles[teacher.status] ?? statusStyles.pendiente;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="sr-only">Perfil del docente</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center pb-2 pt-1 text-center">
          <TeacherAvatar
            photoPath={teacher.photo_url}
            name={teacher.full_name}
            className="h-20 w-20"
          />
          <h2 className="mt-4 font-display text-xl font-semibold text-foreground">
            {teacher.full_name}
          </h2>
          <span
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${status.className}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {status.label}
          </span>
        </div>

        <dl className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
          <Info label="Correo" value={teacher.email} />
          <Info label="Teléfono" value={teacher.phone ?? "—"} />
          <Info
            label="Materias"
            value={teacher.subjects?.length ? teacher.subjects.join(", ") : "—"}
            full
          />
          <Info label="Aulas asignadas" value="Se asignarán al crear aulas" full />
        </dl>

        {teacher.status === "pendiente" && (
          <div className="mt-4 rounded-2xl border border-primary/20 bg-primary-soft/30 p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-primary/80">
              Código de invitación
            </p>
            {activeCode ? (
              <>
                <p className="mt-1 font-display text-lg font-semibold tracking-widest text-foreground">
                  {activeCode.code}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Vence el{" "}
                  {new Date(activeCode.expires_at).toLocaleDateString("es", {
                    day: "numeric",
                    month: "long",
                  })}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    onClick={() => onShowCode(activeCode.code, activeCode.expires_at)}
                  >
                    Ver / compartir
                  </ActionButton>
                  <ActionButton
                    type="button"
                    variant="secondary"
                    onClick={handleRegenerate}
                    loading={regenerating}
                  >
                    Regenerar
                  </ActionButton>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-xs text-muted-foreground">
                  No hay un código activo o expiró. Genera uno nuevo.
                </p>
                <ActionButton
                  type="button"
                  variant="secondary"
                  onClick={handleRegenerate}
                  loading={regenerating}
                  className="mt-3"
                >
                  Generar nuevo código
                </ActionButton>
              </>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <ActionButton
            type="button"
            variant="danger"
            onClick={onDelete}
            loading={deleting}
          >
            Eliminar
          </ActionButton>
          <div className="flex flex-col gap-2 sm:flex-row">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </ActionButton>
            <ActionButton type="button" onClick={onEdit}>
              Editar
            </ActionButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}
