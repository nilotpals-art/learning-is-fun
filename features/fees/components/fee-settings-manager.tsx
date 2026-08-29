"use client";

import { useState, useTransition } from "react";
import { Banknote, MessageSquareText, QrCode, Upload } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toaster, toast } from "@/components/ui/toast";
import { updateFeeSettings, uploadFeeQrCode } from "@/features/fees/actions/fee-actions";
import type { FeeSettings } from "@/features/fees/types/fees";
import { WHATSAPP_TEMPLATES } from "@/features/whatsapp/templates";

const select = "h-10 w-full rounded-2xl border border-input bg-background px-3 text-sm";
const REMINDER_FORMAT = `Dear Parents,\n\nThis is a reminder that ₹{outstanding_amount} is due towards fees for {student_name}.\n\nFee Month: {fee_month}\nFee Head: {fee_head}\nDue Date: {due_date}\n\nPlease ignore this message if payment has already been made.\n\nThank you.\nLearning Is Fun`;
const CONFIRMATION_FORMAT = `Dear Parents,\n\nWe have received ₹{amount} towards fees for {student_name}.\n\nFee Month: {fee_month}\nFee Head: {fee_head}\nReceipt No: {receipt_no}\nPayment Date: {payment_date}\nPayment Mode: {payment_mode}\n\nThank you.\nLearning Is Fun`;

function notify(result: { status: string; message: string }) {
  toast.add({ title: result.status === "success" ? "Success" : "Unable to continue", description: result.message, type: result.status === "success" ? "success" : "error" });
}

function Preview({ format, values }: { format: string; values: Record<string, string> }) {
  const rendered = Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), format);
  return <div className="whitespace-pre-wrap rounded-2xl border bg-muted/30 p-4 text-sm">{rendered}</div>;
}

export function FeeSettingsManager({ settings }: { settings: FeeSettings }) {
  const [value, setValue] = useState(settings);
  const [pending, start] = useTransition();
  const [uploading, startUpload] = useTransition();

  function save() {
    const aligned: FeeSettings = {
      ...value,
      reminderTemplateName: WHATSAPP_TEMPLATES.feesPaymentReminder.name,
      confirmationTemplateName: WHATSAPP_TEMPLATES.feesPaymentConfirmation.name,
      reminderMessageFormat: REMINDER_FORMAT,
      confirmationMessageFormat: CONFIRMATION_FORMAT,
    };
    setValue(aligned);
    start(async () => notify(await updateFeeSettings(aligned)));
  }

  function upload(file: File | null) {
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    startUpload(async () => {
      const result = await uploadFeeQrCode(form);
      notify(result);
      if (result.status === "success" && result.data?.url) setValue((old) => ({ ...old, qrCodeUrl: result.data!.url }));
    });
  }

  return <div className="space-y-6">
    <PageHeader title="Fee Settings" description="Payment instructions and approved Meta WhatsApp templates." />

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="size-5" />Payment Details</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">UPI ID<Input value={value.upiId ?? ""} onChange={(e) => setValue({ ...value, upiId: e.target.value || null })} placeholder="learningisfun@upi" /></label>
          <label className="grid gap-2 text-sm">Bank Name<Input value={value.bankName ?? ""} onChange={(e) => setValue({ ...value, bankName: e.target.value || null })} /></label>
          <label className="grid gap-2 text-sm">Account Holder Name<Input value={value.bankAccountName ?? ""} onChange={(e) => setValue({ ...value, bankAccountName: e.target.value || null })} /></label>
          <label className="grid gap-2 text-sm">Account Number<Input value={value.bankAccountNumber ?? ""} onChange={(e) => setValue({ ...value, bankAccountNumber: e.target.value || null })} /></label>
          <label className="grid gap-2 text-sm">IFSC<Input value={value.bankIfsc ?? ""} onChange={(e) => setValue({ ...value, bankIfsc: e.target.value || null })} /></label>
          <label className="grid gap-2 text-sm">Branch<Input value={value.bankBranch ?? ""} onChange={(e) => setValue({ ...value, bankBranch: e.target.value || null })} /></label>
        </div>
        <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
          <div className="flex min-h-48 items-center justify-center rounded-2xl border bg-muted/30 p-4">
            {value.qrCodeUrl ? <img src={value.qrCodeUrl} alt="Fee payment QR" className="max-h-44 max-w-44 object-contain" /> : <div className="text-center text-sm text-muted-foreground"><QrCode className="mx-auto mb-2 size-10" />No QR uploaded</div>}
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">Payment QR Code</p>
            <p className="text-sm text-muted-foreground">Upload JPG, PNG or WebP. The current QR is replaced when Admin uploads a new one.</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium">
              <Upload className="size-4" /> {uploading ? "Uploading…" : "Upload / Replace QR"}
              <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(e) => upload(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquareText className="size-5" />WhatsApp Pending Fee Reminder</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <label className="flex gap-3 text-sm"><input type="checkbox" checked={value.whatsappFeeRemindersEnabled} onChange={(e) => setValue({ ...value, whatsappFeeRemindersEnabled: e.target.checked })} />Enable pending-fee reminders</label>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm">Send after due date (days)<Input type="number" min="0" max="365" value={value.reminderAfterDueDays} onChange={(e) => setValue({ ...value, reminderAfterDueDays: Number(e.target.value) })} /></label>
          <label className="grid gap-2 text-sm">Repeat every days<Input type="number" min="1" value={value.repeatEveryDays ?? ""} onChange={(e) => setValue({ ...value, repeatEveryDays: e.target.value ? Number(e.target.value) : null })} /></label>
          <label className="grid gap-2 text-sm">Maximum reminders<Input type="number" min="1" value={value.maxRemindersPerDue ?? ""} onChange={(e) => setValue({ ...value, maxRemindersPerDue: e.target.value ? Number(e.target.value) : null })} /></label>
        </div>
        <p className="text-xs text-muted-foreground">Meta template: <strong>{WHATSAPP_TEMPLATES.feesPaymentReminder.name}</strong> · Variables: Amount Due → Student Name → Fee Month → Fee Head → Due Date</p>
        <Preview format={REMINDER_FORMAT} values={{ outstanding_amount: "2500", student_name: "RAHUL SEN", fee_month: "AUGUST 2026", fee_head: "MONTHLY TUITION FEE", due_date: "10 AUGUST 2026" }} />
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquareText className="size-5" />WhatsApp Fee Payment Confirmation</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <label className="flex gap-3 text-sm"><input type="checkbox" checked={value.whatsappPaymentConfirmationsEnabled} onChange={(e) => setValue({ ...value, whatsappPaymentConfirmationsEnabled: e.target.checked })} />Enable fee payment confirmations</label>
        <p className="text-xs text-muted-foreground">Meta template: <strong>{WHATSAPP_TEMPLATES.feesPaymentConfirmation.name}</strong> · Variables: Amount → Student Name → Fee Month → Fee Head → Receipt No → Payment Date → Payment Mode</p>
        <Preview format={CONFIRMATION_FORMAT} values={{ amount: "2500", student_name: "RAHUL SEN", fee_month: "AUGUST 2026", fee_head: "MONTHLY TUITION FEE", receipt_no: "LIF-R-00125", payment_date: "28 AUGUST 2026", payment_mode: "UPI" }} />
        <label className="grid gap-2 text-sm">Send To<select className={select} value={value.recipientPreference} onChange={(e) => setValue({ ...value, recipientPreference: e.target.value as FeeSettings["recipientPreference"] })}><option value="parent">Parent</option><option value="student">Student</option><option value="both">Parent & Student</option></select></label>
      </CardContent>
    </Card>

    <Card><CardContent className="flex items-center justify-between gap-4 pt-6"><p className="text-sm text-muted-foreground">Approved Meta template names and variable order are locked to prevent ERP/Meta mismatch.</p><Button disabled={pending} onClick={save}>{pending ? "Saving…" : "Save Fee Settings"}</Button></CardContent></Card>
    <Toaster />
  </div>;
}
