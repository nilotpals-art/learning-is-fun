"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMAIL_OTP_LENGTH } from "@/features/auth/constants/auth";
import {
  clearPendingOtp,
  resendOtp,
  verifyOtp,
} from "@/features/auth/actions/auth-actions";
import {
  otpTokenSchema,
  type OtpTokenFormValues,
} from "@/features/auth/validations/login-schema";

export function OtpForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OtpTokenFormValues>({
    resolver: zodResolver(otpTokenSchema),
    defaultValues: { token: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result = await verifyOtp(values);
      if (result.status === "redirect") {
        router.replace(result.destination);
        router.refresh();
        return;
      }

      setMessageKind("error");
      setMessage(
        "message" in result ? result.message : "Unable to verify the code."
      );
    });
  });

  function handleResend() {
    setMessage(null);
    startTransition(async () => {
      const result = await resendOtp();
      setMessageKind(result.status === "otp_sent" ? "success" : "error");
      setMessage(result.message);
    });
  }

  function handleChangeEmail() {
    startTransition(async () => {
      reset({ token: "" });
      await clearPendingOtp();
      router.replace("/login");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <label htmlFor="token" className="text-sm font-medium">
          Verification code
        </label>
        <Input
          id="token"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          minLength={EMAIL_OTP_LENGTH}
          maxLength={EMAIL_OTP_LENGTH}
          placeholder={"0".repeat(EMAIL_OTP_LENGTH)}
          className="text-center text-lg tracking-[0.4em]"
          aria-invalid={Boolean(errors.token)}
          aria-describedby={errors.token ? "token-error" : undefined}
          disabled={isPending}
          {...register("token")}
        />
        {errors.token ? (
          <p id="token-error" className="text-sm text-destructive" role="alert">
            {errors.token.message}
          </p>
        ) : null}
      </div>

      {message ? (
        <p
          className={
            messageKind === "success"
              ? "rounded-lg bg-green-50 p-3 text-sm text-green-700"
              : "rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Verifying…" : "Verify and sign in"}
      </Button>
      <div className="flex items-center justify-between text-sm">
        <Button type="button" variant="link" className="px-0" onClick={handleResend} disabled={isPending}>
          Resend code
        </Button>
        <Button
          type="button"
          variant="link"
          className="px-0 text-muted-foreground"
          onClick={handleChangeEmail}
          disabled={isPending}
        >
          Change Email
        </Button>
      </div>
    </form>
  );
}
