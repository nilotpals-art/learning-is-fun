"use client";

import { FormEvent, useState } from "react";

const classes = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const boards = ["ICSE", "ISC", "CBSE"];
const callbackTimes = ["Morning", "Afternoon", "Evening", "Anytime"];

export default function EnquiryPage() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const payload = {
      studentName: form.get("studentName"),
      className: form.get("className"),
      board: form.get("board"),
      contactNo: form.get("contactNo"),
      callbackTime: form.get("callbackTime"),
      website: form.get("website"),
    };

    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to submit enquiry.");
      setSuccess(true);
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit enquiry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-amber-400 px-6 py-7 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-800">Learning Is Fun</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Request a Call Back</h1>
          <p className="mt-2 text-sm font-medium text-slate-800">English Remedial & Coaching Classes • Class V–XII • ICSE / ISC / CBSE</p>
        </div>

        <div className="p-6 sm:p-8">
          {success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
              <h2 className="text-xl font-bold text-emerald-900">Thank you for contacting Learning Is Fun.</h2>
              <p className="mt-2 text-sm leading-6 text-emerald-800">We have received your enquiry and will contact you shortly.</p>
              <button type="button" onClick={() => setSuccess(false)} className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Send another enquiry</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold" htmlFor="studentName">Student Name *</label>
                <input id="studentName" name="studentName" required minLength={2} maxLength={100} autoComplete="name" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" placeholder="Enter student's name" />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold" htmlFor="className">Class *</label>
                  <select id="className" name="className" required defaultValue="" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100">
                    <option value="" disabled>Select class</option>
                    {classes.map((value) => <option key={value} value={value}>Class {value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold" htmlFor="board">Board *</label>
                  <select id="board" name="board" required defaultValue="" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100">
                    <option value="" disabled>Select board</option>
                    {boards.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold" htmlFor="contactNo">Contact Number *</label>
                <div className="flex rounded-xl border border-slate-300 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-100">
                  <span className="border-r border-slate-300 px-4 py-3 text-slate-500">+91</span>
                  <input id="contactNo" name="contactNo" required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} autoComplete="tel" className="min-w-0 flex-1 rounded-r-xl px-4 py-3 outline-none" placeholder="10-digit mobile number" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold" htmlFor="callbackTime">Best Time to Call Back *</label>
                <select id="callbackTime" name="callbackTime" required defaultValue="" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100">
                  <option value="" disabled>Select preferred time</option>
                  {callbackTimes.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>

              <div className="absolute -left-[10000px]" aria-hidden="true">
                <label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off" />
              </div>

              {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

              <button disabled={submitting} className="w-full rounded-xl bg-amber-400 px-5 py-3.5 font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? "Submitting…" : "Request a Call Back"}
              </button>
              <p className="text-center text-xs leading-5 text-slate-500">By submitting this form, you are asking Learning Is Fun to contact you about classes.</p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
