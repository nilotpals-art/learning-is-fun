import { z } from "zod";
import { normalizeUpperText } from "@/lib/validation/normalization";

export const paymentModeSchema = z.object({
  name: z.string().trim().min(1, "Payment Mode Name is required.").transform(normalizeUpperText),
  isActive: z.boolean(),
});

export const paymentModeIdSchema = z.string().uuid("Invalid Payment Mode.");

export type PaymentModeFormValues = z.infer<typeof paymentModeSchema>;
