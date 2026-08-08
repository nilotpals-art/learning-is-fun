import { z } from "zod";
import { normalizeUpperText } from "@/lib/validation/normalization";

const optionalUuid = (message: string) =>
  z
    .string()
    .refine((value) => value === "" || z.string().uuid().safeParse(value).success, message);

const optionalTime = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
    "Enter a valid time."
  );

export const batchSchema = z.object({
  name: z.string().trim().min(1, "Batch Name is required.").transform(normalizeUpperText),
  teacherId: optionalUuid("Invalid Teacher."),
  boardId: optionalUuid("Invalid Board."),
  classId: optionalUuid("Invalid Class."),
  subjectId: optionalUuid("Invalid Subject."),
  startTime: optionalTime,
  endTime: optionalTime,
  days: z.string().trim().transform(normalizeUpperText),
  capacity: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d+$/.test(value),
      "Capacity must be a whole number of zero or greater."
    ),
  room: z.string().trim().transform(normalizeUpperText),
  isActive: z.boolean(),
});

export const batchIdSchema = z.string().uuid("Invalid Batch.");

export type BatchFormValues = z.infer<typeof batchSchema>;
