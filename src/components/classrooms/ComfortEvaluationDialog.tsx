import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ActionButton } from "@/components/ui/action-button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type ComfortRating = "excelente" | "bueno" | "regular" | "malo" | "muy_malo";

const RATINGS: Array<{ value: ComfortRating; label: string; score: number }> = [
  { value: "excelente", label: "Excelente", score: 100 },
  { value: "bueno", label: "Bueno", score: 80 },
  { value: "regular", label: "Regular", score: 60 },
  { value: "malo", label: "Malo", score: 40 },
  { value: "muy_malo", label: "Muy malo", score: 20 },
];

const CRITERIA: Array<{ key: string; label: string }> = [
  { key: "temperatura", label: "Temperatura percibida" },
  { key: "ventilacion", label: "Ventilación" },
  { key: "iluminacion", label: "Iluminación" },
  { key: "ruido", label: "Nivel de ruido" },
  { key: "limpieza", label: "Limpieza" },
  { key: "mobiliario", label: "Estado del mobiliario" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  classroomId: string;
  institutionId: string;
  onSaved: () => void;
}

export function ComfortEvaluationDialog({
  open,
  onOpenChange,
  classroomId,
  institutionId,
  onSaved,
}: Props) {
  const [values, setValues] = useState<Record<string, ComfortRating | undefined>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const filled = CRITERIA.filter((c) => values[c.key]).length;
  const preview =
    filled === 6
      ? Math.round(
          (CRITERIA.reduce(
            (s, c) => s + (RATINGS.find((r) => r.value === values[c.key])?.score ?? 0),
            0,
          ) /
            6) *
            100,
        ) / 100
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (filled < 6) {
      toast.error("Completa las 6 calificaciones");
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      toast.error("Sesión no válida");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("classroom_comfort_evaluations").insert({
      classroom_id: classroomId,
      institution_id: institutionId,
      evaluated_by: uid,
      temperatura: values.temperatura!,
      ventilacion: values.ventilacion!,
      iluminacion: values.iluminacion!,
      ruido: values.ruido!,
      limpieza: values.limpieza!,
      mobiliario: values.mobiliario!,
      comfort_index: 0, // trigger recalcula
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar la evaluación");
      return;
    }
    toast.success("Evaluación registrada");
    setValues({});
    setNotes("");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Evaluar confort del aula</DialogTitle>
          <DialogDescription>
            Califica cada criterio. El índice se calcula automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-5">
          {CRITERIA.map((c) => (
            <div key={c.key}>
              <p className="text-xs font-semibold text-foreground">{c.label}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {RATINGS.map((r) => {
                  const active = values[c.key] === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setValues((v) => ({ ...v, [c.key]: r.value }))}
                      className={cn(
                        "h-8 rounded-full border px-3 text-[11px] font-medium transition-all",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <label className="text-xs font-semibold text-foreground">
              Observaciones (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Detalles adicionales…"
            />
          </div>

          {preview !== null && (
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Índice de confort
              </p>
              <p className="mt-1 font-display text-3xl font-semibold text-foreground">
                {preview}
                <span className="ml-1 text-sm font-medium text-muted-foreground">/ 100</span>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-10 items-center rounded-full border border-border bg-background px-4 text-sm font-medium hover:bg-accent"
            >
              Cancelar
            </button>
            <ActionButton type="submit" loading={saving}>
              Guardar evaluación
            </ActionButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function comfortColor(index: number): { bg: string; text: string; label: string } {
  if (index >= 80) {
    return {
      bg: "bg-emerald-100 dark:bg-emerald-500/15",
      text: "text-emerald-700 dark:text-emerald-300",
      label: "Óptimo",
    };
  }
  if (index >= 50) {
    return {
      bg: "bg-amber-100 dark:bg-amber-500/15",
      text: "text-amber-700 dark:text-amber-300",
      label: "Aceptable",
    };
  }
  return {
    bg: "bg-rose-100 dark:bg-rose-500/15",
    text: "text-rose-700 dark:text-rose-300",
    label: "Crítico",
  };
}

export const COMFORT_CRITERIA_LABELS: Record<string, string> = {
  temperatura: "Temperatura",
  ventilacion: "Ventilación",
  iluminacion: "Iluminación",
  ruido: "Ruido",
  limpieza: "Limpieza",
  mobiliario: "Mobiliario",
};

export const COMFORT_RATING_LABELS: Record<ComfortRating, string> = {
  excelente: "Excelente",
  bueno: "Bueno",
  regular: "Regular",
  malo: "Malo",
  muy_malo: "Muy malo",
};
