import { z } from "zod";

/** Esquemas Zod compartidos — validación en español. */

export const emailSchema = z
  .string({ required_error: "El correo es obligatorio" })
  .trim()
  .min(1, "El correo es obligatorio")
  .email("Ingresa un correo válido")
  .max(255, "El correo es demasiado largo");

export const passwordSchema = z
  .string({ required_error: "La contraseña es obligatoria" })
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña es demasiado larga");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const institutionTypes = [
  { value: "preescolar", label: "Preescolar" },
  { value: "primaria", label: "Primaria" },
  { value: "secundaria", label: "Secundaria" },
  { value: "preparatoria", label: "Preparatoria" },
  { value: "universidad", label: "Universidad" },
  { value: "otro", label: "Otro" },
] as const;

export const institutionTypeSchema = z.enum([
  "preescolar",
  "primaria",
  "secundaria",
  "preparatoria",
  "universidad",
  "otro",
]);

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Ingresa tu nombre completo")
    .max(120, "El nombre es demasiado largo"),
  email: emailSchema,
  password: passwordSchema,
  institutionName: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre de la institución")
    .max(120, "El nombre es demasiado largo"),
  institutionPhone: z
    .string()
    .trim()
    .max(40, "El teléfono es demasiado largo")
    .optional()
    .or(z.literal("")),
  institutionAddress: z
    .string()
    .trim()
    .max(240, "La dirección es demasiado larga")
    .optional()
    .or(z.literal("")),
  institutionCountry: z
    .string()
    .trim()
    .max(80, "El país es demasiado largo")
    .optional()
    .or(z.literal("")),
  institutionType: institutionTypeSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
