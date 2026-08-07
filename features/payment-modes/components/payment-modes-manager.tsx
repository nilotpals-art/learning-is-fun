"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleDollarSign, Eye, MoreHorizontal, Pencil, Plus, Search, ToggleLeft } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster, toast } from "@/components/ui/toast";
import { createPaymentMode, updatePaymentMode } from "@/features/payment-modes/actions/payment-mode-actions";
import type { PaymentMode } from "@/features/payment-modes/types/payment-mode";
import { paymentModeSchema, type PaymentModeFormValues } from "@/features/payment-modes/validations/payment-mode-schema";

type StatusFilter = "all" | "active" | "inactive";
const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const selectClassName = "h-9 rounded-4xl border border-input bg-input/30 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function formatDate(value: string): string { return dateFormatter.format(new Date(value)); }

function PaymentModeFormDialog({ open, paymentMode, onOpenChange, onSaved }: { open: boolean; paymentMode: PaymentMode | null; onOpenChange: (open: boolean) => void; onSaved: (message: string) => void }) {
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<PaymentModeFormValues>({
    resolver: zodResolver(paymentModeSchema),
    values: { name: paymentMode?.name ?? "", isActive: paymentMode?.isActive ?? true },
  });
  function handleOpenChange(next: boolean) { if (!next) reset(); onOpenChange(next); }
  const submit = handleSubmit((values) => startTransition(async () => {
    const result = paymentMode ? await updatePaymentMode(paymentMode.id, values) : await createPaymentMode(values);
    if (result.status === "error") {
      const message = result.fieldErrors?.name?.[0];
      if (message) setError("name", { message });
      toast.add({ title: "Unable to save", description: result.message, type: "error" });
      return;
    }
    handleOpenChange(false);
    onSaved(result.message);
  }));
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{paymentMode ? "Edit Payment Mode" : "Add Payment Mode"}</DialogTitle><DialogDescription>{paymentMode ? "Update this payment method." : "Add a payment method accepted by your institute."}</DialogDescription></DialogHeader>
        <form id="payment-mode-form" onSubmit={submit} noValidate className="space-y-5">
          <div className="space-y-2"><label htmlFor="payment-mode-name" className="text-sm font-medium">Payment Mode Name</label><Input id="payment-mode-name" autoFocus disabled={isPending} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "payment-mode-name-error" : undefined} {...register("name")} />{errors.name ? <p id="payment-mode-name-error" role="alert" className="text-sm text-destructive">{errors.name.message}</p> : null}</div>
          <label className="flex items-center gap-3 rounded-2xl border p-3 text-sm font-medium"><input type="checkbox" className="size-4 accent-primary" disabled={isPending} {...register("isActive")} />Active Payment Mode</label>
        </form>
        <DialogFooter><Button type="button" variant="outline" disabled={isPending} onClick={() => handleOpenChange(false)}>Cancel</Button><Button type="submit" form="payment-mode-form" disabled={isPending}>{isPending ? "Saving…" : paymentMode ? "Save Changes" : "Add Payment Mode"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>; }

export function PaymentModesManager({ paymentModes }: { paymentModes: PaymentMode[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMode | null>(null);
  const [viewing, setViewing] = useState<PaymentMode | null>(null);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return paymentModes.filter((mode) => (!term || mode.name.toLocaleLowerCase().includes(term)) && (status === "all" || (status === "active" ? mode.isActive : !mode.isActive)));
  }, [paymentModes, search, status]);
  const activeCount = paymentModes.filter((mode) => mode.isActive).length;
  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(mode: PaymentMode) { setEditing(mode); setFormOpen(true); }
  function saved(message: string) { toast.add({ title: "Success", description: message, type: "success" }); router.refresh(); }
  function Actions({ mode }: { mode: PaymentMode }) { return <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${mode.name}`} />}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setViewing(mode)}><Eye />View</DropdownMenuItem><DropdownMenuItem onClick={() => openEdit(mode)}><Pencil />Edit</DropdownMenuItem></DropdownMenuContent></DropdownMenu>; }
  return (
    <>
      <Toaster />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-primary">Masters</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Payment Modes</h1><p className="mt-2 text-sm text-muted-foreground">Manage payment methods accepted by your institute.</p></div><Button size="lg" onClick={openCreate}><Plus />Add Payment Mode</Button></div>
        <div className="grid gap-4 md:grid-cols-3"><StatCard title="Total Payment Modes" value={paymentModes.length.toString()} description="Accepted payment methods" icon={CircleDollarSign} tone="blue" /><StatCard title="Active Payment Modes" value={activeCount.toString()} description="Available for future transactions" icon={ToggleLeft} tone="emerald" /><StatCard title="Inactive Payment Modes" value={(paymentModes.length - activeCount).toString()} description="Unavailable for new transactions" icon={ToggleLeft} tone="amber" /></div>
        <Card><CardContent className="space-y-5 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input aria-label="Search Payment Modes" placeholder="Search by Payment Mode Name…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" /></div><select aria-label="Filter by Status" className={selectClassName} value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}><option value="all">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          {paymentModes.length === 0 ? <div className="space-y-4"><EmptyState icon={CircleDollarSign} title="No Payment Modes have been created yet." description="Initialize standard modes or add a custom payment method." /><div className="flex justify-center"><Button onClick={openCreate}><Plus />Add Payment Mode</Button></div></div> : filtered.length === 0 ? <EmptyState icon={Search} title="No matching Payment Modes" description="Try changing your search or status filter." compact /> : <><div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Payment Mode</TableHead><TableHead>Status</TableHead><TableHead>Created On</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{filtered.map((mode) => <TableRow key={mode.id}><TableCell className="font-medium">{mode.name}</TableCell><TableCell><Badge variant={mode.isActive ? "secondary" : "outline"}>{mode.isActive ? "Active" : "Inactive"}</Badge></TableCell><TableCell>{formatDate(mode.createdAt)}</TableCell><TableCell className="text-right"><Actions mode={mode} /></TableCell></TableRow>)}</TableBody></Table></div><div className="grid gap-3 md:hidden">{filtered.map((mode) => <div key={mode.id} className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{mode.name}</p><div className="mt-2"><Badge variant={mode.isActive ? "secondary" : "outline"}>{mode.isActive ? "Active" : "Inactive"}</Badge></div><p className="mt-2 text-xs text-muted-foreground">Created {formatDate(mode.createdAt)}</p></div><Actions mode={mode} /></div></div>)}</div></>}
        </CardContent></Card>
      </div>
      <PaymentModeFormDialog open={formOpen} paymentMode={editing} onOpenChange={setFormOpen} onSaved={saved} />
      <Dialog open={Boolean(viewing)} onOpenChange={(open) => { if (!open) setViewing(null); }}><DialogContent>{viewing ? <><DialogHeader><DialogTitle>{viewing.name}</DialogTitle><DialogDescription>Payment Mode details</DialogDescription></DialogHeader><dl className="grid gap-4 rounded-2xl bg-muted/40 p-4 sm:grid-cols-2"><Detail label="Status" value={viewing.isActive ? "Active" : "Inactive"} /><Detail label="Created On" value={formatDate(viewing.createdAt)} /><Detail label="Updated On" value={formatDate(viewing.updatedAt)} /></dl><DialogFooter><Button variant="outline" onClick={() => setViewing(null)}>Close</Button><Button onClick={() => { setViewing(null); openEdit(viewing); }}>Edit</Button></DialogFooter></> : null}</DialogContent></Dialog>
    </>
  );
}
