import { z } from "zod";

import {
  PARENT_RELATIONSHIPS,
  STUDENT_GENDERS,
  STUDENT_STATUSES,
} from "@/features/students/types/student";
import { normalizeEmail, normalizeUpperText } from "@/lib/validation/normalization";

const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} is required.`);
const optionalText = z.string().trim();
const requiredUpperText = (label: string) =>
  requiredText(label).transform(normalizeUpperText);
const optionalUpperText = optionalText.transform(normalizeUpperText);
const normalizedEmail = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .transform(normalizeEmail);
const dateText = requiredText("Date").refine(
  (value) => !Number.isNaN(Date.parse(`${value}T00:00:00`)),
  "Enter a valid date."
);

export const studentCreateSchema = z.object({
  name: requiredUpperText("Student Name"),
  motherName: optionalUpperText,
  dateOfBirth: dateText.refine(
    (value) => new Date(`${value}T00:00:00`) <= new Date(),
    "Date of Birth cannot be in the future."
  ),
  gender: z.enum(STUDENT_GENDERS),
  mobile: requiredText("Student Mobile"),
  email: normalizedEmail,
  address: optionalUpperText,
  parentName: requiredUpperText("Father / Guardian Name"),
  relationship: z.enum(PARENT_RELATIONSHIPS),
  parentMobile: requiredText("Parent Mobile"),
  parentEmail: normalizedEmail,
  academicYearId: z.string().uuid("Select an Academic Year."),
  admissionDate: dateText,
  status: z.enum(STUDENT_STATUSES),
  comments: optionalUpperText,
  useExistingParentId: z.string().uuid().nullable().optional(),
});

export const studentEditSchema = z.object({
  name: requiredUpperText("Student Name"),
  motherName: optionalUpperText,
  dateOfBirth: dateText.refine(
    (value) => new Date(`${value}T00:00:00`) <= new Date(),
    "Date of Birth cannot be in the future."
  ),
  gender: z.enum(STUDENT_GENDERS),
  mobile: requiredText("Student Mobile"),
  address: optionalUpperText,
  admissionDate: dateText,
  status: z.enum(STUDENT_STATUSES),
  comments: optionalUpperText,
});

export const studentIdSchema = z.string().uuid();
export type StudentCreateValues = z.infer<typeof studentCreateSchema>;
export type StudentEditValues = z.infer<typeof studentEditSchema>;
