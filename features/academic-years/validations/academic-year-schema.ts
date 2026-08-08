import { z } from "zod";
import { normalizeUpperText } from "@/lib/validation/normalization";

const dateSchema = z
  .string()
  .min(1, "A date is required.")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Enter a valid date.");

export const academicYearSchema = z
  .object({
    name: z.string().trim().min(1, "Academic Year Name is required.").transform(normalizeUpperText),
    startDate: dateSchema,
    endDate: dateSchema,
    isActive: z.boolean(),
  })
  .refine((values) => values.endDate > values.startDate, {
    path: ["endDate"],
    message: "End Date must be later than Start Date.",
  });

export const academicYearIdSchema = z.string().uuid("Invalid Academic Year.");

export type AcademicYearFormValues = z.infer<typeof academicYearSchema>;
