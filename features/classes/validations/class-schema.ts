import { z } from "zod";
import { normalizeUpperText } from "@/lib/validation/normalization";

export const classSchema = z.object({
  className: z.string().trim().min(1, "Class Name is required.").transform(normalizeUpperText),
  displayOrder: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d+$/.test(value),
      "Display Order must be a whole number of zero or greater."
    ),
});

export const classIdSchema = z.string().uuid("Invalid Class.");

export type ClassFormValues = z.infer<typeof classSchema>;
