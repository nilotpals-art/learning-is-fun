import { z } from "zod";

export const parentProfileSchema = z.object({
  mobile: z.string().trim().min(8, "Enter a valid WhatsApp number.").max(20, "WhatsApp number is too long."),
  email: z.string().trim().email("Enter a valid email address.").max(254),
});

export type ParentProfileValues = z.infer<typeof parentProfileSchema>;
