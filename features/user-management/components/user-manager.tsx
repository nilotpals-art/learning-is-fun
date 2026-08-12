"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createAdministratorAction,
  updateAdministratorAction,
} from "@/features/user-management/actions/user-management-actions";
import type {
  ManagedAdministrator,
  ManagedBranch,
} from "@/features/user-management/types/user-management";

const emptyForm = { name: "", email: "", mobile: "", branchId: "", isActive: true };

export function UserManager({ users, branches }: { users: ManagedAdministrator[]; branches: ManagedBranch[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedAdministrator | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [feedback, setFeedback] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFeedback(null);
    setDialogOpen(true);
  }

  function openEdit(user: ManagedAdministrator) {
    setEditing(user);
    setForm({ name: user.name, email: user.email, mobile: user.mobile, branchId: user.branchId ?? "", isActive: user.isActive });
    setFeedback(null);
    setDialogOpen(true);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = editing
        ? await updateAdministratorAction({ id: editing.id, name: form.name, mobile: form.mobile, branchId: form.branchId, isActive: form.isActive })
        : await createAdministratorAction(form);
      setFeedback(result.message);
      if (result.status === "success") {
        setDialogOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button type="button" onClick={openCreate}>
          <Plus aria-hidden="true" />
          Create Administrator
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Administrator Accounts</CardTitle></CardHeader>
        <CardContent>
          {users.length ? (
            <div className="grid gap-3">
              {users.map((user) => (
                <article key={user.id} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email} · {user.mobile}</p>
                    <p className="text-xs text-muted-foreground">{user.branchName ?? "Institute-wide"} · {user.authLinked ? "Auth linked" : "Auth link missing"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.isActive ? "default" : "secondary"}>{user.isActive ? "Active" : "Inactive"}</Badge>
                    <Button type="button" variant="outline" size="sm" onClick={() => openEdit(user)}>Edit</Button>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="p-8 text-center text-muted-foreground">No Administrator accounts yet.</p>}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={submit} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{editing ? `Edit ${editing.name}` : "Create Administrator"}</DialogTitle>
              <DialogDescription>{editing ? "Update the permitted Administrator account fields." : "Create an ordinary Administrator account for this institute. Email OTP login will be enabled."}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <label htmlFor="administrator-name" className="text-sm font-medium">Full Name<Input id="administrator-name" required autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label htmlFor="administrator-email" className="text-sm font-medium">Email<Input id="administrator-email" required type="email" disabled={Boolean(editing)} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
              <label htmlFor="administrator-mobile" className="text-sm font-medium">Mobile<Input id="administrator-mobile" required value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value })} /></label>
              <label htmlFor="administrator-branch" className="text-sm font-medium">Branch<select id="administrator-branch" className="mt-1 h-10 w-full rounded-xl border bg-background px-3" value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })}><option value="">All branches / Institute-wide</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
              <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />Active account</label>
              {feedback ? <p role="status" className="text-sm text-destructive">{feedback}</p> : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={isPending} onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : editing ? "Save Changes" : "Create Administrator"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
