"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createStaffAction, updateStaffAction } from "@/features/user-management/actions/user-management-actions";
import type { ManagedBranch, ManagedStaff } from "@/features/user-management/types/user-management";
import { STAFF_PERMISSION_OPTIONS } from "@/lib/auth/permissions";

const emptyForm = { name: "", email: "", mobile: "", branchId: "", role: "Teacher" as "Teacher" | "Accountant", isActive: true, permissionCodes: [] as string[] };

export function StaffManager({ users, branches }: { users: ManagedStaff[]; branches: ManagedBranch[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedStaff | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [feedback, setFeedback] = useState<string | null>(null);

  function openCreate() { setEditing(null); setForm(emptyForm); setFeedback(null); setDialogOpen(true); }
  function openEdit(user: ManagedStaff) {
    setEditing(user);
    setForm({ name: user.name, email: user.email, mobile: user.mobile, branchId: user.branchId ?? "", role: user.role, isActive: user.isActive, permissionCodes: [...user.permissionCodes] });
    setFeedback(null);
    setDialogOpen(true);
  }
  function togglePermission(code: string) {
    setForm((current) => ({ ...current, permissionCodes: current.permissionCodes.includes(code) ? current.permissionCodes.filter((item) => item !== code) : [...current.permissionCodes, code] }));
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = editing
        ? await updateStaffAction({ id: editing.id, name: form.name, mobile: form.mobile, branchId: form.branchId, role: form.role, isActive: form.isActive, permissionCodes: form.permissionCodes })
        : await createStaffAction(form);
      setFeedback(result.message);
      if (result.status === "success") { setDialogOpen(false); router.refresh(); }
    });
  }

  return <div className="space-y-6">
    <div className="flex justify-end"><Button type="button" onClick={openCreate}><Plus aria-hidden="true" />Create Staff Login</Button></div>
    <Card><CardHeader><CardTitle>Teacher & Accountant Accounts</CardTitle></CardHeader><CardContent>
      {users.length ? <div className="grid gap-3">{users.map((user) => <article key={user.id} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{user.name}</p><Badge variant="outline">{user.role}</Badge></div><p className="text-sm text-muted-foreground">{user.email} · {user.mobile}</p><p className="text-xs text-muted-foreground">{user.branchName ?? "Institute-wide"} · {user.permissionCodes.length} module permission{user.permissionCodes.length === 1 ? "" : "s"}</p></div>
        <div className="flex items-center gap-2"><Badge variant={user.isActive ? "default" : "secondary"}>{user.isActive ? "Active" : "Inactive"}</Badge><Button type="button" variant="outline" size="sm" onClick={() => openEdit(user)}>Edit Access</Button></div>
      </article>)}</div> : <p className="p-8 text-center text-muted-foreground">No Teacher or Accountant logins yet.</p>}
    </CardContent></Card>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-h-[90vh] overflow-y-auto"><form onSubmit={submit} className="space-y-5">
      <DialogHeader><DialogTitle>{editing ? `Edit ${editing.name}` : "Create Staff Login"}</DialogTitle><DialogDescription>Email OTP and the one-active-session rule apply automatically. Select only the ERP modules this user should access.</DialogDescription></DialogHeader>
      <div className="grid gap-4">
        <label className="text-sm font-medium">Full Name<Input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="text-sm font-medium">Email<Input required type="email" disabled={Boolean(editing)} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label className="text-sm font-medium">Mobile<Input required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></label>
        <label className="text-sm font-medium">Role<select className="mt-1 h-10 w-full rounded-xl border bg-background px-3" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "Teacher" | "Accountant" })}><option value="Teacher">Teacher</option><option value="Accountant">Accountant</option></select></label>
        <label className="text-sm font-medium">Branch<select className="mt-1 h-10 w-full rounded-xl border bg-background px-3" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}><option value="">All branches / Institute-wide</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <fieldset className="space-y-2"><legend className="text-sm font-semibold">Access Permissions</legend>{STAFF_PERMISSION_OPTIONS.map((permission) => <label key={permission.code} className="flex items-start gap-3 rounded-xl border p-3"><input className="mt-1" type="checkbox" checked={form.permissionCodes.includes(permission.code)} onChange={() => togglePermission(permission.code)} /><span><span className="block text-sm font-medium">{permission.label}</span><span className="block text-xs text-muted-foreground">{permission.description}</span></span></label>)}</fieldset>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Active account</label>
        {feedback ? <p role="status" className="text-sm text-destructive">{feedback}</p> : null}
      </div>
      <DialogFooter><Button type="button" variant="outline" disabled={isPending} onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={isPending}>{isPending ? "Saving…" : editing ? "Save Access" : "Create Staff Login"}</Button></DialogFooter>
    </form></DialogContent></Dialog>
  </div>;
}
