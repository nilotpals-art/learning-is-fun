import { z } from "zod";

export const schoolBoardSchema = z.object({
  name: z.string().trim().min(1, "Board Name is required."),
});

export const schoolBoardIdSchema = z.string().uuid("Invalid School Board.");

export type SchoolBoardFormValues = z.infer<typeof schoolBoardSchema>;
