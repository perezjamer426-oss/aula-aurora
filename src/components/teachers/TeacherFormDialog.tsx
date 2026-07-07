import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { teacherSchema, type TeacherInput } from "@/lib/validation";
import { Field } from "@/components/form/Field";
import { SelectField } from "@/components/form/SelectField";
import { ActionButton } from "@/components/ui/action-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TeacherAvatar } from "./TeacherAvatar";
import type { Database } from "@/integrations/supabase/types";

export type TeacherRow = Database["public"]["Tables"]["teachers"]["Row"];

interface TeacherFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
  teacher?: TeacherRow | null;
  onSaved: (result: { teacherId: string; invitationCode?: string }) => void;
}

const emptyForm: TeacherInput = {
  fullName: "",
  email: "",
  phone: "",
  subjects: "",
  status: "pendiente",
};

/** Formulario para crear o editar un docente. */
export function TeacherFormDialog({
  open,
  onOpenChange,
  institutionId,
  teacher,
  onSaved,
}: TeacherFormDialogProps) {
  const [form, setForm] = useState<TeacherInput>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof TeacherInput, string>>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (teacher) {
      setForm({
        fullName: teacher.full_name,
        email: teacher.email,
        phone: teacher.phone ?? "",
        subjects: (teacher.subjects ?? []).join(", "),
        status: teacher.status,
      });
      setPhotoPath(teacher.photo_url);
    } else {
      setForm(emptyForm);
      setPhotoPath(null);
    }
    setPhotoFile(null);
    setErrors({});
    setFormError(null);
  }, [open, teacher]);

  function update<K extends keyof TeacherInput>(key: K, value: TeacherInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = teacherSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof TeacherInput, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof TeacherInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      const subjectsArr = (parsed.data.subjects ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      let finalPhotoPath = photoPath;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop() ?? "jpg";
        const path = `${institutionId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("teacher-photos")
          .upload(path, photoFile, { upsert: false, contentType: photoFile.type });
        if (uploadError) throw uploadError;
        finalPhotoPath = path;
      }

      if (teacher) {
        const { error } = await supabase
          .from("teachers")
          .update({
            full_name: parsed.data.fullName,
            email: parsed.data.email.toLowerCase(),
            phone: parsed.data.phone || null,
            subjects: subjectsArr,
            status: parsed.data.status,
            photo_url: finalPhotoPath,
          })
          .eq("id", teacher.id);
        if (error) throw error;
        onSaved({ teacherId: teacher.id });
        onOpenChange(false);
        return;
      }

      // Crear: usa RPC para generar la invitación
      const { data, error } = await supabase.rpc("create_teacher_with_invitation", {
        _full_name: parsed.data.fullName,
        _email: parsed.data.email,
        _phone: parsed.data.phone ?? "",
        _subjects: subjectsArr,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const newId = row?.teacher_id as string;
      const code = row?.invitation_code as string;

      // Guardar foto si aplica
      if (finalPhotoPath && newId) {
        await supabase.from("teachers").update({ photo_url: finalPhotoPath }).eq("id", newId);
      }

      onSaved({ teacherId: newId, invitationCode: code });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      setFormError(
        err instanceof Error ? err.message : "No pudimos guardar el docente.",
      );
    } finally {
      setSaving(false);
    }
  }

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoFile(e.target.files?.[0] ?? null);
  }

  const previewUrl = photoFile ? URL.createObjectURL(photoFile) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {teacher ? "Editar docente" : "Nuevo docente"}
          </DialogTitle>
          <DialogDescription>
            {teacher
              ? "Actualiza los datos del docente."
              : "Al crear el docente se generará un código único de invitación."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-4">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Vista previa"
                className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/30"
              />
            ) : (
              <TeacherAvatar
                photoPath={photoPath}
                name={form.fullName || "· ·"}
                className="h-16 w-16"
              />
            )}
            <div className="flex flex-col gap-1.5">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickPhoto}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-9 items-center rounded-full border border-border bg-background px-3.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                {photoPath || photoFile ? "Cambiar foto" : "Subir foto"}
              </button>
              <p className="text-[11px] text-muted-foreground">Opcional · máx. 2 MB</p>
            </div>
          </div>

          <Field
            label="Nombre completo"
            placeholder="Ej. Ana Torres Vega"
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            error={errors.fullName}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Correo"
              type="email"
              placeholder="docente@escuela.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              error={errors.email}
            />
            <Field
              label="Teléfono"
              optional
              placeholder="+51 999 999 999"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              error={errors.phone}
            />
          </div>

          <Field
            label="Materias asignadas"
            optional
            placeholder="Matemáticas, Física, Química"
            hint="Sepáralas con comas."
            value={form.subjects}
            onChange={(e) => update("subjects", e.target.value)}
            error={errors.subjects}
          />

          <div className="rounded-xl border border-dashed border-border bg-surface/60 p-3.5">
            <p className="text-xs font-medium text-foreground">Aulas asignadas</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Se asignarán automáticamente cuando crees aulas en el módulo correspondiente.
            </p>
          </div>

          {teacher && (
            <SelectField
              label="Estado"
              value={form.status}
              onChange={(e) => update("status", e.target.value as TeacherInput["status"])}
              options={[
                { value: "pendiente", label: "Pendiente" },
                { value: "activo", label: "Activo" },
                { value: "inactivo", label: "Inactivo" },
              ]}
              error={errors.status}
            />
          )}

          {formError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs font-medium text-destructive">
              {formError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </ActionButton>
            <ActionButton type="submit" loading={saving}>
              {teacher ? "Guardar cambios" : "Crear docente"}
            </ActionButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
