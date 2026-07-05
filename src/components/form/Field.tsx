import { forwardRef, type InputHTMLAttributes, useId } from "react";
import { cn } from "@/lib/utils";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
}

/** Campo de formulario reutilizable, estilo premium. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, optional, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="flex items-center justify-between text-sm font-medium text-foreground"
      >
        <span>{label}</span>
        {optional && (
          <span className="text-[11px] font-normal text-muted-foreground">Opcional</span>
        )}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(
          "h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground shadow-xs transition-all",
          "placeholder:text-muted-foreground/60",
          "focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
