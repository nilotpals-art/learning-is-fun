import { z } from "zod";

import { EMAIL_OTP_LENGTH } from "@/features/auth/constants/auth";
import { normalizeEmail } from "@/lib/validation/normalization";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .transform(normalizeEmail),
});

export const otpSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .transform(normalizeEmail),
  token: z
    .string()
    .regex(
      new RegExp(`^\\d{${EMAIL_OTP_LENGTH}}$`),
      `Enter the ${EMAIL_OTP_LENGTH}-digit verification code`
    ),
});

export const otpTokenSchema = otpSchema.pick({ token: true });

export type LoginFormValues = z.input<typeof loginSchema>;
export type OtpFormValues = z.input<typeof otpSchema>;
export type OtpTokenFormValues = z.input<typeof otpTokenSchema>;
