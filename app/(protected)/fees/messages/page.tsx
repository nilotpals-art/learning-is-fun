import { MessagesManager } from "@/features/fees/components/fees-manager";
import { deleteQueuedFeeMessagesForStudent } from "@/features/fees/actions/delete-queued-messages";
import { listFeeMessages } from "@/features/fees/services/fee-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function Page() {
  const profile = await requireRole(DASHBOARD_ROLES);
  const messages = await listFeeMessages(profile);
  const queued = messages.filter((message) => message.status === "queued" && message.studentId);
  const students = Array.from(
    new Map(queued.map((message) => [message.studentId, message.studentName])).entries(),
  ).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));

  async function deleteQueued(formData: FormData) {
    "use server";
    const studentId = String(formData.get("studentId") ?? "");
    await deleteQueuedFeeMessagesForStudent(studentId);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Delete Queued Messages</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a student and delete only messages that are still queued. Sent, delivered and failed history is retained.
        </p>
        <form action={deleteQueued} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="grid gap-2 text-sm">
            Student
            <select
              name="studentId"
              required
              disabled={students.length === 0}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              defaultValue=""
            >
              <option value="" disabled>{students.length === 0 ? "No students with queued messages" : "Select student"}</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.name}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={students.length === 0}
            className="h-10 rounded-xl bg-destructive px-4 text-sm font-medium text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete Queued Messages
          </button>
        </form>
      </section>
      <MessagesManager messages={messages} />
    </div>
  );
}
