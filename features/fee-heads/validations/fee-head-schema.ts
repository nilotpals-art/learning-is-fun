import { z } from "zod";
import { normalizeUpperText } from "@/lib/validation/normalization";

export const FEE_HEAD_CATEGORIES = [
  "Academic",
  "Examination",
  "Security Deposit",
  "Miscellaneous",
  "Other",
] as const;

export const feeHeadSchema = z
  .object({
    name: z.string().trim().min(1, "Fee Head Name is required.").transform(normalizeUpperText),
    code: z
      .string()
      .trim()
      .min(1, "Fee Head Code is required.")
      .transform(normalizeUpperText),
    categoryChoice: z.enum(FEE_HEAD_CATEGORIES),
    customCategory: z.string().trim().transform(normalizeUpperText),
    displayOrder: z
      .string()
      .trim()
      .refine(
        (value) => /^[1-9]\d*$/.test(value),
        "Display Order must be a whole number of one or greater."
      ),
    feeNature: z.enum(["regular", "one_time", "refundable_deposit"]),
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
