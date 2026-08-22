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
const optionalNormalizedEmail = z.union([normalizedEmail, z.literal("")]);
const mobile = (label: string) => requiredText(label).regex(/^[6-9][0-9]{9}$/, `${label} must be a valid 10-digit mobile number.`);
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
  mobile: mobile("Student Mobile"),
  email: normalizedEmail,
  schoolName: optionalUpperText,
  address: optionalUpperText,
  parentName: requiredUpperText("Father / Guardian Name"),
  relationship: z.enum(PARENT_RELATIONSHIPS),
  parentMobile: mobile("Parent Mobile"),
  parentEmail: normalizedEmail,
  academicYearId: z.string().uuid("Select an Academic Year."),
  classId: z.string().uuid("Select a Class."),
  feeStructureId: z.string().uuid().nullable(),
  feeOverrides: z.array(z.object({ itemId: z.string().uuid(), include: z.boolean(), amount: z.coerce.number().positive(), discountType: z.enum(["fixed","percentage"]).nullable(), discountValue: z.coerce.number().min(0) })),
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
  mobile: mobile("Student Mobile"),
  email: optionalNormalizedEmail,
  schoolName: optionalUpperText,
  address: optionalUpperText,
  parentName: requiredUpperText("Father / Guardian Name"),
  relationship: z.enum(PARENT_RELATIONSHIPS),
  parentMobile: mobile("Parent Mobile"),
  parentEmail: optionalNormalizedEmail,
  admissionDate: dateText,
  status: z.enum(STUDENT_STATUSES),
  comments: optionalUpperText,
}).refine((value) => Boolean(value.email || value.parentEmail), {
  path: ["parentEmail"],
  message: "At least Student Email or Parent Email is required.",
});

export const studentIdSchema = z.string().uuid();
export type StudentCreateValues = z.infer<typeof studentCreateSchema>;
export type StudentEditValues = z.infer<typeof studentEditSchema>;
