import { createUrgentNoticeAction, deleteUrgentNoticeAction, toggleUrgentNoticeAction, updateUrgentNoticeAction } from "@/features/learning-planner/actions/urgent-notice-actions";
import type { UrgentNotice } from "@/features/learning-planner/services/urgent-notice-service";

function localInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function UrgentNoticeAdmin({ notices }: { notices: UrgentNotice[] }) {
  const defaultStart = localInputValue(new Date().toISOString());
  return (
    <section className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold">Urgent Popup Notices</h2>
        <p className="mt-1 text-sm text-muted-foreground">Create a centre-screen notice for students, parents, or both. Acknowledged notices will not keep reappearing for the same user.</p>
      </div>

      <form action={createUrgentNoticeAction} className="grid gap-4 rounded-xl border bg-muted/20 p-4 md:grid-cols-2">
        <label className="space-y-1 md:col-span-2"><span className="text-sm font-medium">Title</span><input name="title" required maxLength={160} className="w-full rounded-md border bg-background px-3 py-2" placeholder="Important announcement" /></label>
        <label className="space-y-1 md:col-span-2"><span className="text-sm font-medium">Message</span><textarea name="message" required maxLength={3000} rows={4} className="w-full rounded-md border bg-background px-3 py-2" placeholder="Type the urgent notice here..." /></label>
        <label className="space-y-1"><span className="text-sm font-medium">Audience</span><select name="targetAudience" defaultValue="Both" className="w-full rounded-md border bg-background px-3 py-2"><option>Both</option><option>Student</option><option>Parent</option></select></label>
        <label className="space-y-1"><span className="text-sm font-medium">Start</span><input type="datetime-local" name="startAt" required defaultValue={defaultStart} className="w-full rounded-md border bg-background px-3 py-2" /></label>
        <label className="space-y-1"><span className="text-sm font-medium">Expiry (optional)</span><input type="datetime-local" name="endAt" className="w-full rounded-md border bg-background px-3 py-2" /></label>
        <label className="flex items-center gap-2 self-end pb-2"><input type="checkbox" name="mustAcknowledge" defaultChecked /><span className="text-sm font-medium">Must click “I Understand”</span></label>
        <div className="md:col-span-2"><button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Create Urgent Notice</button></div>
      </form>

      <div className="space-y-4">
        {notices.length === 0 ? <p className="rounded-xl border p-5 text-sm text-muted-foreground">No urgent popup notices created yet.</p> : notices.map((notice) => (
          <div key={notice.id} className="rounded-xl border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-semibold">{notice.title}</p><p className="text-xs text-muted-foreground">{notice.targetAudience} · {notice.isActive ? "Active" : "Inactive"}</p></div>
              <div className="flex gap-2">
                <form action={toggleUrgentNoticeAction}><input type="hidden" name="id" value={notice.id} /><input type="hidden" name="active" value={String(!notice.isActive)} /><button className="rounded-md border px-3 py-1.5 text-xs font-medium">{notice.isActive ? "Deactivate" : "Activate"}</button></form>
                <form action={deleteUrgentNoticeAction}><input type="hidden" name="id" value={notice.id} /><button className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600">Delete</button></form>
              </div>
            </div>
            <details>
              <summary className="cursor-pointer text-sm font-medium">Edit notice</summary>
              <form action={updateUrgentNoticeAction} className="mt-3 grid gap-3 md:grid-cols-2">
                <input type="hidden" name="id" value={notice.id} />
                <label className="space-y-1 md:col-span-2"><span className="text-xs font-medium">Title</span><input name="title" required defaultValue={notice.title} className="w-full rounded-md border px-3 py-2" /></label>
                <label className="space-y-1 md:col-span-2"><span className="text-xs font-medium">Message</span><textarea name="message" required defaultValue={notice.message} rows={3} className="w-full rounded-md border px-3 py-2" /></label>
                <label className="space-y-1"><span className="text-xs font-medium">Audience</span><select name="targetAudience" defaultValue={notice.targetAudience} className="w-full rounded-md border px-3 py-2"><option>Both</option><option>Student</option><option>Parent</option></select></label>
                <label className="space-y-1"><span className="text-xs font-medium">Start</span><input type="datetime-local" name="startAt" required defaultValue={localInputValue(notice.startAt)} className="w-full rounded-md border px-3 py-2" /></label>
                <label className="space-y-1"><span className="text-xs font-medium">Expiry</span><input type="datetime-local" name="endAt" defaultValue={localInputValue(notice.endAt)} className="w-full rounded-md border px-3 py-2" /></label>
                <label className="flex items-center gap-2"><input type="checkbox" name="mustAcknowledge" defaultChecked={notice.mustAcknowledge} /><span className="text-sm">Must acknowledge</span></label>
                <div className="md:col-span-2"><button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save Changes</button></div>
              </form>
            </details>
          </div>
        ))}
      </div>
    </section>
  );
}
