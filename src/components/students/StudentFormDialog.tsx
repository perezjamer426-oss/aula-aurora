import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { studentSchema, type StudentInput } from "@/lib/validation";
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
import { StudentAvatar } from "./StudentAvatar";
import type { Database } from "@/integrations/supabase/types";

export type StudentRow = Database["public"]["Tables"]["students"]["Row"];

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId: string;
  userId: string;
  student?: StudentRow | null;
  onSaved: () => void;
}

const emptyForm: StudentInput = {
  fullName: "",
  dni: "",
  grade: "",
  section: "",
  birthDate: "",
  guardianName: "",
  phone: "",
  email: "",
  status: "activo",
};

/** Formulario premium para crear o editar un estudiante. */
export function StudentFormDialog({
  open,
  onOpenChange,
  institutionId,
  userId,
  student,
  onSaved,
}: StudentFormDialogProps) {
  const [form, setForm] = useState<StudentInput>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof StudentInput, string>>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (student) {
      setForm({
        fullName: student.full_name,
        dni: student.dni ?? "",
        grade: student.grade,
        section: student.section,
        birthDate: student.birth_date ?? "",
        guardianName: student.guardian_name ?? "",
        phone: student.phone ?? "",
        email: student.email ?? "",
        status: student.status,
      });
      setPhotoPath(student.photo_url);
    } else {
      setForm(emptyForm);
      setPhotoPath(null);
    }
    setPhotoFile(null);
    setErrors({});
    setFormError(null);
  }, [open, student]);

  function update<K extends keyof StudentInput>(key: K, value: StudentInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = studentSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof StudentInput, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof StudentInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      let finalPhotoPath = photoPath;

      if (photoFile) {
        const ext = photoFile.name.split(".").pop() ?? "jpg";
        const path = `${institutionId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("student-photos")
          .upload(path, photoFile, { upsert: false, contentType: photoFile.type });
        if (uploadError) throw uploadError;
        finalPhotoPath = path;
      }

      const payload = {
        institution_id: institutionId,
        full_name: parsed.data.fullName,
        dni: parsed.data.dni || null,
        grade: parsed.data.grade,
        section: parsed.data.section,
        birth_date: parsed.data.birthDate || null,
        guardian_name: parsed.data.guardianName || null,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        status: parsed.data.status,
        photo_url: finalPhotoPath,
      };

      if (student) {
        const { error } = await supabase
          .from("students")
          .update(payload)
          .eq("id", student.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("students")
          .insert({ ...payload, created_by: userId });
        if (error) throw error;
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      setFormError(
        err instanceof Error ? err.message : "No pudimos guardar el estudiante.",
      );
    } finally {
      setSaving(false);
    }
  }

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
  }

  const previewUrl = photoFile ? URL.createObjectURL(photoFile) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {student ? "Editar estudiante" : "Nuevo estudiante"}
          </DialogTitle>
          <DialogDescription>
            Completa la información. Los campos marcados como opcionales pueden dejarse vacíos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Foto */}
          <div className="flex items-center gap-4">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Vista previa"
                className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/30"
              />
            ) : (
              <StudentAvatar
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
            placeholder="Ej. María Pérez López"
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            error={errors.fullName}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="DNI"
              optional
              placeholder="Ej. 12345678"
              value={form.dni}
              onChange={(e) => update("dni", e.target.value)}
              error={errors.dni}
            />
            <Field
              label="Fecha de nacimiento"
              optional
              type="date"
              value={form.birthDate}
              onChange={(e) => update("birthDate", e.target.value)}
              error={errors.birthDate}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Grado"
              placeholder="Ej. 3ro"
              value={form.grade}
              onChange={(e) => update("grade", e.target.value)}
              error={errors.grade}
            />
            <Field
              label="Sección"
              placeholder="Ej. A"
              value={form.section}
              onChange={(e) => update("section", e.target.value)}
              error={errors.section}
            />
          </div>

          <Field
            label="Apoderado"
            optional
            placeholder="Nombre del padre, madre o tutor"
            value={form.guardianName}
            onChange={(e) => update("guardianName", e.target.value)}
            error={errors.guardianName}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Teléfono"
              optional
              placeholder="+51 999 999 999"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              error={errors.phone}
            />
            <Field
              label="Correo"
              optional
              type="email"
              placeholder="correo@ejemplo.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              error={errors.email}
            />
          </div>

          <SelectField
            label="Estado"
            value={form.status}
            onChange={(e) => update("status", e.target.value as StudentInput["status"])}
            options={[
              { value: "activo", label: "Activo" },
              { value: "inactivo", label: "Inactivo" },
            ]}
            error={errors.status}
          />

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
              {student ? "Guardar cambios" : "Crear estudiante"}
            </ActionButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
