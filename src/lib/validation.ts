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

export const studentStatusSchema = z.enum(["activo", "inactivo"]);

export const studentSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre completo")
    .max(160, "El nombre es demasiado largo"),
  dni: z
    .string()
    .trim()
    .max(40, "El DNI es demasiado largo")
    .optional()
    .or(z.literal("")),
  grade: z
    .string()
    .trim()
    .min(1, "Selecciona o escribe un grado")
    .max(40, "El grado es demasiado largo"),
  section: z
    .string()
    .trim()
    .min(1, "Selecciona o escribe una sección")
    .max(20, "La sección es demasiado larga"),
  birthDate: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
  guardianName: z
    .string()
    .trim()
    .max(160, "El nombre del apoderado es demasiado largo")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(40, "El teléfono es demasiado largo")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .max(160, "El correo es demasiado largo")
    .email("Ingresa un correo válido")
    .optional()
    .or(z.literal("")),
  status: studentStatusSchema,
});

export const teacherStatusSchema = z.enum(["pendiente", "activo", "inactivo"]);

export const teacherSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Ingresa el nombre completo")
    .max(160, "El nombre es demasiado largo"),
  email: z
    .string()
    .trim()
    .min(1, "El correo es obligatorio")
    .email("Ingresa un correo válido")
    .max(160, "El correo es demasiado largo"),
  phone: z
    .string()
    .trim()
    .max(40, "El teléfono es demasiado largo")
    .optional()
    .or(z.literal("")),
  subjects: z
    .string()
    .trim()
    .max(400, "Demasiadas materias")
    .optional()
    .or(z.literal("")),
  status: teacherStatusSchema,
});

export const teacherSignupSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Ingresa el código de invitación")
      .max(40, "Código demasiado largo"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type StudentInput = z.infer<typeof studentSchema>;
export type TeacherInput = z.infer<typeof teacherSchema>;
export type TeacherSignupInput = z.infer<typeof teacherSignupSchema>;
