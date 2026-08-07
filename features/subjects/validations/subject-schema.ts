import { z } from "zod";

export const subjectSchema = z.object({
  subjectName: z.string().trim().min(1, "Subject Name is required."),
});

export const subjectIdSchema = z.string().uuid("Invalid Subject.");

export type SubjectFormValues = z.infer<typeof subjectSchema>;
