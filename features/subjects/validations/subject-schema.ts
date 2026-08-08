import { z } from "zod";
import { normalizeUpperText } from "@/lib/validation/normalization";

export const subjectSchema = z.object({
  subjectName: z.string().trim().min(1, "Subject Name is required.").transform(normalizeUpperText),
});

export const subjectIdSchema = z.string().uuid("Invalid Subject.");

export type SubjectFormValues = z.infer<typeof subjectSchema>;
