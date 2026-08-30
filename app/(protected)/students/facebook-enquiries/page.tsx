import { MessageSquareText, Phone, Trash2 } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import {
  deleteFacebookEnquiry,
  FACEBOOK_ENQUIRY_STATUSES,
  listFacebookEnquiries,
  updateFacebookEnquiry,
  type FacebookEnquiryStatus,
} from "@/features/facebook-enquiries/service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

async function updateEnquiryAction(formData: FormData) {
  "use server";
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as FacebookEnquiryStatus;
  const internalNote = String(formData.get("internalNote") ?? "");
  if (!id || !FACEBOOK_ENQUIRY_STATUSES.includes(status)) return;

  await updateFacebookEnquiry(profile.instituteId, id, { status, internalNote });
  revalidatePath("/students/facebook-enquiries");
}

async function deleteEnquiryAction(formData: FormData) {
  "use server";
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteFacebookEnquiry(profile.instituteId, id);
  revalidatePath("/students/facebook-enquiries");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export default async function FacebookEnquiriesPage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");
  const enquiries = await listFacebookEnquiries(profile.instituteId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facebook Enquiries"
        description="View and follow up enquiries received from the public Facebook enquiry form."
        icon={MessageSquareText}
        theme="students"
      />

      <div className="grid gap-4 sm:grid-cols-4">
        {FACEBOOK_ENQUIRY_STATUSES.map((status) => (
          <div key={status} className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{status}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{enquiries.filter((item) => item.status === status).length}</p>
          </div>
        ))}
      </div>

      {enquiries.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-slate-500">
          No Facebook enquiries have been received yet.
        </div>
      ) : (
        <div className="space-y-4">
          {enquiries.map((enquiry) => (
            <article key={enquiry.id} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{enquiry.student_name}</h2>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">{enquiry.status}</span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{enquiry.source}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                    <p><span className="font-semibold text-slate-800">Class:</span> {enquiry.class_name}</p>
                    <p><span className="font-semibold text-slate-800">Board:</span> {enquiry.board}</p>
                    <p><span className="font-semibold text-slate-800">Call back:</span> {enquiry.callback_time}</p>
                    <p><span className="font-semibold text-slate-800">Received:</span> {formatDate(enquiry.created_at)}</p>
                  </div>
                  <a href={`tel:+91${enquiry.contact_no}`} className="mt-3 inline-flex items-center gap-2 font-semibold text-blue-700 hover:underline">
                    <Phone className="h-4 w-4" /> +91 {enquiry.contact_no}
                  </a>
                </div>

                <form action={deleteEnquiryAction}>
                  <input type="hidden" name="id" value={enquiry.id} />
                  <button type="submit" className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" title="Delete enquiry">
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </form>
              </div>

              <form action={updateEnquiryAction} className="mt-5 grid gap-4 border-t pt-4 lg:grid-cols-[220px_1fr_auto] lg:items-end">
                <input type="hidden" name="id" value={enquiry.id} />
                <div>
                  <label htmlFor={`status-${enquiry.id}`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
                  <select id={`status-${enquiry.id}`} name="status" defaultValue={enquiry.status} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                    {FACEBOOK_ENQUIRY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor={`note-${enquiry.id}`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Internal Note</label>
                  <input id={`note-${enquiry.id}`} name="internalNote" defaultValue={enquiry.internal_note ?? ""} maxLength={500} placeholder="e.g. Called parent, asked to call again on Saturday" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                </div>
                <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Save</button>
              </form>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
