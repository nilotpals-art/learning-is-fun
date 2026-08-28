"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";

import { acknowledgeUrgentNoticeAction } from "@/features/learning-planner/actions/urgent-notice-actions";
import type { UrgentNotice } from "@/features/learning-planner/services/urgent-notice-service";

export function UrgentNoticePopup({ notices }: { notices: UrgentNotice[] }) {
  const [index, setIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const notice = notices[index];
  if (!notice) return null;

  function acknowledge() {
    startTransition(async () => {
      await acknowledgeUrgentNoticeAction(notice.id);
      setIndex((value) => value + 1);
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="urgent-notice-title">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-red-200 bg-white shadow-2xl">
        <div className="flex items-center gap-3 bg-red-600 px-5 py-4 text-white">
          <span className="rounded-full bg-white/15 p-2"><AlertTriangle className="h-6 w-6" /></span>
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-red-100">Urgent Notice</p><h2 id="urgent-notice-title" className="text-xl font-bold">{notice.title}</h2></div>
        </div>
        <div className="space-y-5 p-6">
          <p className="whitespace-pre-wrap text-base leading-7 text-slate-700">{notice.message}</p>
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <p className="text-xs text-slate-500">{index + 1} of {notices.length}{notice.mustAcknowledge ? " · acknowledgement required" : ""}</p>
            <button type="button" disabled={pending} onClick={acknowledge} className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60">
              {pending ? "Please wait…" : notice.mustAcknowledge ? "I Understand" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
