import { z } from "zod";

export const paymentModeSchema = z.object({
  name: z.string().trim().min(1, "Payment Mode Name is required."),
  isActive: z.boolean(),
});

export const paymentModeIdSchema = z.string().uuid("Invalid Payment Mode.");

export type PaymentModeFormValues = z.infer<typeof paymentModeSchema>;
