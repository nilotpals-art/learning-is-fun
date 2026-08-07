import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .transform((email) => email.toLowerCase()),
});

export const otpSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .transform((email) => email.toLowerCase()),
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit verification code"),
});

export const otpTokenSchema = otpSchema.pick({ token: true });

export type LoginFormValues = z.input<typeof loginSchema>;
export type OtpFormValues = z.input<typeof otpSchema>;
export type OtpTokenFormValues = z.input<typeof otpTokenSchema>;
