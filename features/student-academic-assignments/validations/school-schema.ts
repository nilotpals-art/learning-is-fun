import { z } from "zod";
import { normalizeUpperText } from "@/lib/validation/normalization";

export const createSchoolSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "School Name is required.")
    .max(200, "School Name must not exceed 200 characters.")
    .transform(normalizeUpperText),
});

export type CreateSchoolValues = z.infer<typeof createSchoolSchema>;
