"use client";

import {
  CheckCircle2,
  GraduationCap,
  LockKeyhole,
  Mail,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast, Toaster } from "@/components/ui/toast";
import {
  requestEnrollmentOtpAction,
  submitEnrollmentAction,
  verifyEnrollmentOtpAction,
} from "@/features/student-enrollment/actions/enrollment-actions";
import type {
  EnrollmentInviteView,
  EnrollmentPurpose,
} from "@/features/student-enrollment/services/enrollment-service";

const fieldClass =
  "flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:border-indigo-400 focus-visible:ring-[3px] focus-visible:ring-indigo-100";
const upper = (value: string) => value.toLocaleUpperCase("en-IN");
const cardClass = "overflow-hidden border-0 bg-white/95 shadow-lg ring-1 ring-slate-200/70";

function SectionTitle({ icon: Icon, title, subtitle, tone }: { icon: React.ElementType; title: string; subtitle?: string; tone: "indigo" | "emerald" | "amber" | "violet" | "sky" }) {
  const toneClass = {
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
  }[tone];
  return <div className="flex items-start gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ring-1 ${toneClass}`}><Icon className="size-5" /></span><div><CardTitle className="text-lg text-slate-900">{title}</CardTitle>{subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}</div></div>;
}

function EmailVerification({ token, purpose, label, email, onEmail, verifiedEmail, onVerified, noEmail, onNoEmail }: {
  token: string; purpose: EnrollmentPurpose; label: string; email: string; onEmail: (value: string) => void;
  verifiedEmail: string | null; onVerified: (value: string) => void; noEmail: boolean; onNoEmail: (value: boolean) => void;
}) {
  const [otp, setOtp] = useState("");
  const [isPending, startTransition] = useTransition();
  const verified = !noEmail && verifiedEmail === email.trim().toLowerCase() && Boolean(email);
  function toggleNoEmail(checked: boolean) { onNoEmail(checked); if (checked) { onEmail(""); onVerified(""); setOtp(""); } }

  return <div className={`space-y-3 rounded-2xl border p-4 transition ${verified ? "border-emerald-200 bg-emerald-50/70" : noEmail ? "border-slate-200 bg-slate-50" : "border-indigo-100 bg-indigo-50/40"}`}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{label}</p><p className="text-xs text-slate-500">Verify this email to enable portal access.</p></div><label className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200"><input type="checkbox" checked={noEmail} onChange={(e) => toggleNoEmail(e.target.checked)} />No email</label></div>
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><Input className="h-12 min-w-0 rounded-xl bg-white text-base" type="email" disabled={noEmail} value={email} onChange={(e) => { onEmail(e.target.value.toLowerCase()); if (verifiedEmail && e.target.value.toLowerCase() !== verifiedEmail) onVerified(""); }} placeholder={noEmail ? "No email selected" : "name@example.com"} /><Button className="h-12 rounded-xl" type="button" variant="outline" disabled={noEmail || isPending || !email || verified} onClick={() => startTransition(async () => { const r = await requestEnrollmentOtpAction(token, purpose, email); toast.add({ title: r.status === "success" ? "OTP sent" : "Unable to send OTP", description: r.message, type: r.status === "success" ? "success" : "error" }); })}><Mail />Send OTP</Button></div>
    {noEmail ? <p className="text-xs text-slate-500">No portal login will be created for this person unless an email is added later.</p> : verified ? <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700"><CheckCircle2 className="size-4" />Email verified</p> : <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><Input className="h-12 rounded-xl bg-white text-base tracking-[0.25em]" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit OTP" /><Button className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700" type="button" disabled={isPending || otp.length !== 6 || !email} onClick={() => startTransition(async () => { const r = await verifyEnrollmentOtpAction(token, purpose, email, otp); if (r.status === "success") { onVerified(r.email); setOtp(""); } toast.add({ title: r.status === "success" ? "Email verified" : "Verification failed", description: r.message, type: r.status === "success" ? "success" : "error" }); })}><ShieldCheck />Verify</Button></div>}
  </div>;
}

export function ParentEnrollmentForm({ invite }: { invite: EnrollmentInviteView }) {
  const router = useRouter(); const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(""); const [motherName, setMotherName] = useState(""); const [gender, setGender] = useState("Male"); const [dateOfBirth, setDateOfBirth] = useState(""); const [studentMobile, setStudentMobile] = useState(""); const [studentEmail, setStudentEmail] = useState(""); const [studentNoEmail, setStudentNoEmail] = useState(false); const [verifiedStudentEmail, setVerifiedStudentEmail] = useState(invite.studentEmailVerified ?? ""); const [schoolName, setSchoolName] = useState(""); const [address, setAddress] = useState(""); const [parentName, setParentName] = useState(""); const [relationship, setRelationship] = useState("Father"); const [parentEmail, setParentEmail] = useState(""); const [parentNoEmail, setParentNoEmail] = useState(false); const [verifiedParentEmail, setVerifiedParentEmail] = useState(invite.parentEmailVerified ?? ""); const [parentRequest, setParentRequest] = useState(""); const [rulesAccepted, setRulesAccepted] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const studentVerified = !studentNoEmail && verifiedStudentEmail === studentEmail.trim().toLowerCase() && Boolean(studentEmail);
  const parentVerified = !parentNoEmail && verifiedParentEmail === parentEmail.trim().toLowerCase() && Boolean(parentEmail);
  const emailChoiceValid = !(studentNoEmail && parentNoEmail);
  const emailVerificationValid = (studentNoEmail || studentVerified) && (parentNoEmail || parentVerified);
  const emailsDifferent = !studentEmail || !parentEmail || studentEmail.trim().toLowerCase() !== parentEmail.trim().toLowerCase();
  const canSubmit = useMemo(() => emailChoiceValid && emailVerificationValid && emailsDifferent && rulesAccepted && Boolean(name.trim()) && Boolean(dateOfBirth) && studentMobile.length === 10 && Boolean(parentName.trim()), [emailChoiceValid, emailVerificationValid, emailsDifferent, rulesAccepted, name, dateOfBirth, studentMobile, parentName]);
  const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

  function submit() { startTransition(async () => { const result = await submitEnrollmentAction(invite.token, { name, motherName, gender, dateOfBirth, studentMobile, studentEmail: studentNoEmail ? "" : studentEmail, studentNoEmail, schoolName, address, parentName, relationship, parentEmail: parentNoEmail ? "" : parentEmail, parentNoEmail, parentRequest, rulesAccepted }); if (result.status === "error") { toast.add({ title: "Unable to submit enrollment", description: result.message, type: "error" }); return; } router.push(`/enroll/${invite.token}/success`); }); }

  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.12),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.10),_transparent_28%),linear-gradient(to_bottom,_#f8fafc,_#eef2ff_55%,_#f8fafc)]"><Toaster />
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:py-12">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-violet-700 to-sky-600 p-6 text-white shadow-xl sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ring-1 ring-white/20"><Sparkles className="size-3.5" />English Remedial Classes</div><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Learning Is Fun</h1><p className="mt-2 max-w-2xl text-sm text-indigo-50 sm:text-base">Student Enrollment Form · Secure, simple and verified enrollment for your child.</p></div><div className="grid size-16 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25"><GraduationCap className="size-8" /></div></div></header>

      <Card className={cardClass}><CardContent className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">{[
        ["Academic Year", invite.academicYearName, "bg-indigo-50 text-indigo-700"],
        ["Class", invite.className, "bg-sky-50 text-sky-700"],
        ["Parent WhatsApp", invite.parentMobile, "bg-emerald-50 text-emerald-700"],
      ].map(([label, value, tone], index) => <div key={label} className={`rounded-2xl p-4 ${tone}`}><p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p><p className="mt-1 flex items-center gap-1.5 text-base font-bold">{index === 2 ? <LockKeyhole className="size-4" /> : null}{value}</p>{index === 2 ? <p className="mt-1 text-xs opacity-70">Locked by institute</p> : null}</div>)}</CardContent></Card>

      <Card className={cardClass}><CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-sky-50"><SectionTitle icon={UserRound} title="Student Details" subtitle="Basic student and school information" tone="indigo" /></CardHeader><CardContent className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6"><label className="space-y-2 text-sm font-medium text-slate-700">Student Name *<Input value={name} onChange={(e) => setName(upper(e.target.value))} className="h-11 rounded-xl uppercase" /></label><label className="space-y-2 text-sm font-medium text-slate-700">Mother Name<Input value={motherName} onChange={(e) => setMotherName(upper(e.target.value))} className="h-11 rounded-xl uppercase" /></label><label className="space-y-2 text-sm font-medium text-slate-700">Date of Birth *<Input type="date" max={today} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="h-11 rounded-xl" /></label><label className="space-y-2 text-sm font-medium text-slate-700">Gender *<select className={fieldClass} value={gender} onChange={(e) => setGender(e.target.value)}><option>Male</option><option>Female</option><option>Other</option></select></label><label className="space-y-2 text-sm font-medium text-slate-700">Student Mobile *<Input className="h-11 rounded-xl" inputMode="numeric" maxLength={10} value={studentMobile} onChange={(e) => setStudentMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile" /></label><label className="space-y-2 text-sm font-medium text-slate-700">School Name<Input className="h-11 rounded-xl uppercase" value={schoolName} onChange={(e) => setSchoolName(upper(e.target.value))} placeholder="School name" /></label><div className="sm:col-span-2"><EmailVerification token={invite.token} purpose="STUDENT" label="Student Email" email={studentEmail} onEmail={setStudentEmail} verifiedEmail={verifiedStudentEmail || null} onVerified={setVerifiedStudentEmail} noEmail={studentNoEmail} onNoEmail={setStudentNoEmail} /></div><label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">Address<textarea className={`${fieldClass} min-h-24 resize-y py-2 uppercase`} value={address} onChange={(e) => setAddress(upper(e.target.value))} /></label></CardContent></Card>

      <Card className={cardClass}><CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50"><SectionTitle icon={UsersRound} title="Parent / Guardian Details" subtitle="Contact and portal information" tone="emerald" /></CardHeader><CardContent className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6"><label className="space-y-2 text-sm font-medium text-slate-700">Father / Guardian Name *<Input className="h-11 rounded-xl uppercase" value={parentName} onChange={(e) => setParentName(upper(e.target.value))} /></label><label className="space-y-2 text-sm font-medium text-slate-700">Relationship *<select className={fieldClass} value={relationship} onChange={(e) => setRelationship(e.target.value)}><option>Father</option><option>Mother</option><option>Guardian</option></select></label><label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">WhatsApp / Phone Number *<div className="relative"><LockKeyhole className="absolute left-3 top-3.5 size-4 text-emerald-600" /><Input value={invite.parentMobile} disabled className="h-11 rounded-xl bg-emerald-50/70 pl-9 font-semibold text-slate-700" /></div><span className="text-xs font-normal text-slate-500">This number came from the secure WhatsApp enrollment link and cannot be changed.</span></label><div className="sm:col-span-2"><EmailVerification token={invite.token} purpose="PARENT" label="Parent Email" email={parentEmail} onEmail={setParentEmail} verifiedEmail={verifiedParentEmail || null} onVerified={setVerifiedParentEmail} noEmail={parentNoEmail} onNoEmail={setParentNoEmail} /></div></CardContent></Card>

      <div className="grid gap-6 lg:grid-cols-2"><Card className={cardClass}><CardHeader className="border-b bg-gradient-to-r from-violet-50 to-fuchsia-50"><SectionTitle icon={MessageSquareText} title="Comments / Request" subtitle="Optional note for the institute" tone="violet" /></CardHeader><CardContent className="p-5 sm:p-6"><textarea maxLength={1000} className={`${fieldClass} min-h-32 resize-y py-3 uppercase`} value={parentRequest} onChange={(e) => setParentRequest(upper(e.target.value))} placeholder="Any comment or request for Learning Is Fun" /></CardContent></Card>

      <Card className={cardClass}><CardHeader className="border-b bg-gradient-to-r from-sky-50 to-indigo-50"><SectionTitle icon={ShieldCheck} title="Portal Access" subtitle="At least one verified email is required" tone="sky" /></CardHeader><CardContent className="space-y-3 p-5 text-sm text-slate-600 sm:p-6"><div className="grid gap-2"><p className="rounded-xl bg-sky-50 p-3"><strong className="text-sky-800">Student Email:</strong> enables Student Portal.</p><p className="rounded-xl bg-emerald-50 p-3"><strong className="text-emerald-800">Parent Email:</strong> enables Parent Portal.</p><p className="rounded-xl bg-indigo-50 p-3"><strong className="text-indigo-800">Both emails:</strong> enables both portals.</p></div>{!emailChoiceValid ? <p className="font-medium text-destructive">Student and Parent cannot both be marked No email.</p> : null}{!emailsDifferent ? <p className="font-medium text-destructive">Student and Parent Email must be different.</p> : null}</CardContent></Card></div>

      <Card className={cardClass}><CardHeader className="border-b bg-gradient-to-r from-amber-50 to-orange-50"><SectionTitle icon={WalletCards} title="Fees" subtitle="Institute-approved amounts shown for reference" tone="amber" /></CardHeader><CardContent className="space-y-3 p-5 sm:p-6"><div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Amounts are fixed by Learning Is Fun. Parents cannot edit fees, security deposit, or discounts.</div>{invite.feeItems.map((item) => { const amount = item.feeNature === "refundable_deposit" ? invite.securityDepositAmount : item.amount; return <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div><p className="font-semibold text-slate-900">{item.name}</p><p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{item.feeNature.replaceAll("_", " ")} · {item.scheduleType.replaceAll("_", " ")}</p></div><p className="text-lg font-bold text-amber-700">{currency.format(amount)}</p></div>; })}</CardContent></Card>

      <Card className="overflow-hidden border-0 bg-slate-950 text-white shadow-xl"><CardContent className="space-y-5 p-6 sm:p-8"><label className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 text-sm ring-1 ring-white/10"><input type="checkbox" className="mt-1 size-4 accent-indigo-500" checked={rulesAccepted} onChange={(e) => setRulesAccepted(e.target.checked)} /><span>I have read and agree with the <strong>Rules &amp; Regulations of Learning Is Fun</strong>. *</span></label><div className="rounded-xl bg-white/5 p-3 text-xs text-slate-300">By submitting this form, the parent/guardian confirms that the information provided is correct and accepts the institute&apos;s applicable rules and regulations.</div><Button size="lg" className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500 text-base font-semibold shadow-lg hover:opacity-95" disabled={!canSubmit || isPending} onClick={submit}>{isPending ? "Submitting…" : "Submit Enrollment Form"}</Button>{!emailVerificationValid ? <p className="text-center text-sm text-amber-300">Every email provided must be OTP verified before submission.</p> : null}</CardContent></Card>
    </div>
  </div>;
}
