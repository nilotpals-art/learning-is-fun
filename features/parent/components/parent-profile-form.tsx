"use client";

import { useActionState } from "react";
import { Mail, MessageCircle, Save, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateParentProfile, type ParentProfileActionState } from "@/features/parent/actions/parent-profile-actions";

const initialState: ParentProfileActionState = { status: "idle", message: "" };

export function ParentProfileForm({ name, mobile, email }: { name: string; mobile: string; email: string }) {
  const [state, action, pending] = useActionState(updateParentProfile, initialState);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-teal-900 px-6 py-7 text-white sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-200">Parent Profile</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">{name}</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-200">Keep your email and WhatsApp number current so important institute communication reaches you.</p>
        </div>

        <form action={action} className="space-y-6 p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-700"><MessageCircle className="size-4 text-teal-700" />WhatsApp Number</span>
              <Input name="mobile" defaultValue={mobile} inputMode="tel" autoComplete="tel" disabled={pending} className="h-11 border-slate-300 bg-slate-50/70 focus-visible:border-teal-600" />
              {state.fieldErrors?.mobile?.[0] ? <span className="text-xs font-medium text-red-600">{state.fieldErrors.mobile[0]}</span> : null}
            </label>
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-700"><Mail className="size-4 text-blue-800" />Email Address</span>
              <Input name="email" type="email" defaultValue={email} autoComplete="email" disabled={pending} className="h-11 border-slate-300 bg-slate-50/70 focus-visible:border-blue-700" />
              {state.fieldErrors?.email?.[0] ? <span className="text-xs font-medium text-red-600">{state.fieldErrors.email[0]}</span> : null}
            </label>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-teal-100 bg-teal-50/70 p-4 text-sm text-slate-700">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-teal-700" />
            <p>You can update only your own Parent profile. These contact details are used for parent communication and WhatsApp notifications.</p>
          </div>

          {state.message ? <p className={state.status === "success" ? "rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700" : "rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"}>{state.message}</p> : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending} className="min-w-40 bg-gradient-to-r from-blue-900 to-teal-700 font-bold text-white hover:from-blue-800 hover:to-teal-600">
              <Save className="size-4" />{pending ? "Saving…" : "Save Profile"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
