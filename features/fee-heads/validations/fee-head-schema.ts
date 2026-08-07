import { z } from "zod";

export const FEE_HEAD_CATEGORIES = [
  "Academic",
  "Examination",
  "Security Deposit",
  "Miscellaneous",
  "Other",
] as const;

export const feeHeadSchema = z
  .object({
    name: z.string().trim().min(1, "Fee Head Name is required."),
    code: z
      .string()
      .trim()
      .min(1, "Fee Head Code is required.")
      .transform((value) => value.toUpperCase()),
    categoryChoice: z.enum(FEE_HEAD_CATEGORIES),
    customCategory: z.string().trim(),
    displayOrder: z
      .string()
      .trim()
      .refine(
        (value) => /^[1-9]\d*$/.test(value),
        "Display Order must be a whole number of one or greater."
      ),
    isActive: z.boolean(),
  })
  .superRefine((values, context) => {
    if (values.categoryChoice === "Other" && !values.customCategory) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customCategory"],
        message: "Custom Category is required.",
      });
    }
  });

export const feeHeadIdSchema = z.string().uuid("Invalid Fee Head.");

export type FeeHeadFormValues = z.infer<typeof feeHeadSchema>;

export function getFeeHeadCategory(values: FeeHeadFormValues): string {
  return values.categoryChoice === "Other"
    ? values.customCategory
    : values.categoryChoice;
}
