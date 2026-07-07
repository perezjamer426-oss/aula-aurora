import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ActionButton } from "@/components/ui/action-button";

interface InvitationCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string | null;
  teacherName: string;
  institutionName: string;
  expiresAt?: string | null;
}

/** Diálogo que muestra el código de invitación con copiar y compartir. */
export function InvitationCodeDialog({
  open,
  onOpenChange,
  code,
  teacherName,
  institutionName,
  expiresAt,
}: InvitationCodeDialogProps) {
  const [copied, setCopied] = useState(false);

  const signupUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/registrar-docente${code ? `?code=${encodeURIComponent(code)}` : ""}`
      : "";

  async function handleCopy() {
    if (!code) return;
    const text = `Hola ${teacherName}, te invito a unirte a ${institutionName} en AureoSense.\n\nCódigo: ${code}\nRegístrate en: ${signupUrl}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }

  async function handleShare() {
    if (!code) return;
    const text = `Hola ${teacherName}, únete a ${institutionName} en AureoSense con el código ${code}: ${signupUrl}`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
          title: "Invitación AureoSense",
          text,
          url: signupUrl,
        });
        return;
      } catch {
        /* usuario canceló */
      }
    }
    // Fallback: WhatsApp web
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  const expiresLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString("es", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Código de invitación
          </DialogTitle>
          <DialogDescription>
            Compártelo con {teacherName} para que se una a la institución.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 rounded-2xl border border-primary/20 bg-primary-soft/40 p-6 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wider text-primary/80">
            Código único
          </p>
          <p className="mt-2 select-all font-display text-2xl font-semibold tracking-widest text-foreground">
            {code ?? "—"}
          </p>
          {expiresLabel && (
            <p className="mt-3 text-xs text-muted-foreground">
              Válido hasta el {expiresLabel}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <ActionButton type="button" variant="secondary" onClick={handleCopy}>
            {copied ? "Copiado ✓" : "Copiar"}
          </ActionButton>
          <ActionButton type="button" onClick={handleShare}>
            Compartir
          </ActionButton>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          El código sirve una única vez. Puedes regenerarlo desde el perfil del docente.
        </p>
      </DialogContent>
    </Dialog>
  );
}
