"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarClock,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toaster, toast } from "@/components/ui/toast";
import {
  createBatch,
  deleteBatch,
  updateBatch,
} from "@/features/batches/actions/batch-actions";
import type {
  Batch,
  BatchFormOptions,
} from "@/features/batches/types/batch";
import {
  batchSchema,
  type BatchFormValues,
} from "@/features/batches/validations/batch-schema";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const selectClassName =
  "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

function formatCreatedAt(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : "Not available";
}

function formatTime(value: string | null): string {
  return value ? value.slice(0, 5) : "Not set";
}

function formatSchedule(batch: Batch): string {
  if (!batch.startTime && !batch.endTime) return batch.days ?? "Not set";
  const time = `${formatTime(batch.startTime)} – ${formatTime(batch.endTime)}`;
  return batch.days ? `${batch.days}, ${time}` : time;
}

function defaultValues(batch: Batch | null): BatchFormValues {
  return {
    name: batch?.name ?? "",
    teacherId: batch?.teacherId ?? "",
    boardId: batch?.boardId ?? "",
    classId: batch?.classId ?? "",
    subjectId: batch?.subjectId ?? "",
    startTime: batch?.startTime?.slice(0, 5) ?? "",
    endTime: batch?.endTime?.slice(0, 5) ?? "",
    days: batch?.days ?? "",
    capacity: batch?.capacity?.toString() ?? "",
    room: batch?.room ?? "",
    isActive: batch?.isActive ?? true,
  };
}

function BatchFormDialog({
  open,
  batch,
  options,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  batch: Batch | null;
  options: BatchFormOptions;
  onOpenChange: (open: boolean) => void;
  onSaved: (message: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<BatchFormValues>({
    resolver: zodResolver(batchSchema),
    values: defaultValues(batch),
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  const submit = handleSubmit((values) => {
    startTransition(async () => {
      const result = batch
        ? await updateBatch(batch.id, values)
        : await createBatch(values);

      if (result.status === "error") {
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          const message = messages?.[0];
          if (message) setError(field as keyof BatchFormValues, { message });
        }
        toast.add({ title: "Unable to save", description: result.message, type: "error" });
        return;
      }

      handleOpenChange(false);
      onSaved(result.message);
    });
  });

  const relationFields = [
    { name: "teacherId", label: "Teacher", options: options.teachers },
    { name: "boardId", label: "Board", options: options.boards },
    { name: "classId", label: "Class", options: options.classes },
    { name: "subjectId", label: "Subject", options: options.subjects },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{batch ? "Edit Batch" : "Add Batch"}</DialogTitle>
          <DialogDescription>
            {batch ? "Update this teaching Batch." : "Create a teaching Batch for your institute."}
          </DialogDescription>
        </DialogHeader>
        <form id="batch-form" onSubmit={submit} noValidate className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="batch-name" className="text-sm font-medium">Batch Name</label>
            <Input
              id="batch-name"
              autoFocus
              disabled={isPending}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "batch-name-error" : undefined}
              {...register("name")}
            />
            {errors.name ? <p id="batch-name-error" role="alert" className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {relationFields.map((field) => (
              <div key={field.name} className="space-y-2">
                <label htmlFor={`batch-${field.name}`} className="text-sm font-medium">{field.label}</label>
                <select
                  id={`batch-${field.name}`}
                  disabled={isPending}
                  className={selectClassName}
                  aria-invalid={Boolean(errors[field.name])}
                  aria-describedby={errors[field.name] ? `batch-${field.name}-error` : undefined}
                  {...register(field.name)}
                >
                  <option value="">Not set</option>
                  {field.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
                {errors[field.name] ? <p id={`batch-${field.name}-error`} role="alert" className="text-sm text-destructive">{errors[field.name]?.message}</p> : null}
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="batch-start-time" className="text-sm font-medium">Start Time</label>
              <Input id="batch-start-time" type="time" disabled={isPending} aria-invalid={Boolean(errors.startTime)} {...register("startTime")} />
              {errors.startTime ? <p role="alert" className="text-sm text-destructive">{errors.startTime.message}</p> : null}
            </div>
            <div className="space-y-2">
              <label htmlFor="batch-end-time" className="text-sm font-medium">End Time</label>
              <Input id="batch-end-time" type="time" disabled={isPending} aria-invalid={Boolean(errors.endTime)} {...register("endTime")} />
              {errors.endTime ? <p role="alert" className="text-sm text-destructive">{errors.endTime.message}</p> : null}
            </div>
            <div className="space-y-2">
              <label htmlFor="batch-days" className="text-sm font-medium">Days</label>
              <Input id="batch-days" placeholder="For example, Monday, Wednesday" disabled={isPending} {...register("days")} />
            </div>
            <div className="space-y-2">
              <label htmlFor="batch-capacity" className="text-sm font-medium">Capacity</label>
              <Input id="batch-capacity" inputMode="numeric" disabled={isPending} aria-invalid={Boolean(errors.capacity)} {...register("capacity")} />
              {errors.capacity ? <p role="alert" className="text-sm text-destructive">{errors.capacity.message}</p> : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="batch-room" className="text-sm font-medium">Room</label>
              <Input id="batch-room" disabled={isPending} {...register("room")} />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border p-3 text-sm font-medium">
            <input type="checkbox" className="size-4 accent-primary" disabled={isPending} {...register("isActive")} />
            Active Batch
          </label>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isPending} onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="batch-form" disabled={isPending}>
            {isPending ? "Saving…" : batch ? "Save Changes" : "Add Batch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>;
}

export function BatchesManager({ batches, options }: { batches: Batch[]; options: BatchFormOptions }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [viewing, setViewing] = useState<Batch | null>(null);
  const [deleting, setDeleting] = useState<Batch | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  const filteredBatches = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return batches;
    return batches.filter((batch) => batch.name.toLocaleLowerCase().includes(term));
  }, [batches, search]);
  const activeCount = batches.filter((batch) => batch.isActive).length;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(batch: Batch) {
    setEditing(batch);
    setFormOpen(true);
  }

  function saved(message: string) {
    toast.add({ title: "Success", description: message, type: "success" });
    router.refresh();
  }

  function confirmDelete() {
    if (!deleting) return;
    startDeleting(async () => {
      const result = await deleteBatch(deleting.id);
      if (result.status === "error") {
        toast.add({ title: "Unable to delete", description: result.message, type: "error" });
        return;
      }
      setDeleting(null);
      toast.add({ title: "Batch deleted", description: result.message, type: "success" });
      router.refresh();
    });
  }

  function Actions({ batch }: { batch: Batch }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${batch.name}`} />}>
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setViewing(batch)}><Eye />View</DropdownMenuItem>
          <DropdownMenuItem onClick={() => openEdit(batch)}><Pencil />Edit</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleting(batch)}><Trash2 />Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <Toaster />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-medium text-primary">Masters</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Batches</h1><p className="mt-2 text-sm text-muted-foreground">Manage teaching batches within your institute.</p></div>
          <Button onClick={openCreate}><Plus />Add Batch</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <StatCard title="Total Batches" value={batches.length.toString()} description="Teaching batches created" icon={Users} tone="blue" />
          <StatCard title="Active Batches" value={activeCount.toString()} description="Available teaching batches" icon={CalendarClock} tone="emerald" />
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input aria-label="Search Batches" placeholder="Search Batches…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
            </div>
          </CardContent>

          {batches.length === 0 ? (
            <CardContent className="pt-0"><EmptyState icon={Users} title="No Batches have been created yet." description="Create the first teaching Batch to get started." /></CardContent>
          ) : filteredBatches.length === 0 ? (
            <CardContent className="pt-0"><EmptyState icon={Search} title="No matching Batches" description="Try changing your search." compact /></CardContent>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader><TableRow><TableHead>Batch Name</TableHead><TableHead>Board</TableHead><TableHead>Class</TableHead><TableHead>Subject</TableHead><TableHead>Schedule</TableHead><TableHead>Capacity</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredBatches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">{batch.name}</TableCell>
                        <TableCell>{batch.boardName ?? "Not set"}</TableCell>
                        <TableCell>{batch.className ?? "Not set"}</TableCell>
                        <TableCell>{batch.subjectName ?? "Not set"}</TableCell>
                        <TableCell>{formatSchedule(batch)}</TableCell>
                        <TableCell>{batch.capacity ?? "Not set"}</TableCell>
                        <TableCell><Badge variant={batch.isActive ? "secondary" : "outline"}>{batch.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                        <TableCell className="text-right"><Actions batch={batch} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <CardContent className="grid gap-3 md:hidden">
                {filteredBatches.map((batch) => (
                  <div key={batch.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{batch.name}</p><p className="mt-1 text-xs text-muted-foreground">Board: {batch.boardName ?? "Not set"}</p><p className="mt-1 text-xs text-muted-foreground">Class: {batch.className ?? "Not set"} · Subject: {batch.subjectName ?? "Not set"}</p></div><Actions batch={batch} /></div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Badge variant={batch.isActive ? "secondary" : "outline"}>{batch.isActive ? "Active" : "Inactive"}</Badge><span>{formatSchedule(batch)}</span><span>Capacity: {batch.capacity ?? "Not set"}</span></div>
                  </div>
                ))}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      <BatchFormDialog open={formOpen} batch={editing} options={options} onOpenChange={setFormOpen} onSaved={saved} />

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => { if (!open) setViewing(null); }}>
        <DialogContent className="sm:max-w-xl">
          {viewing ? <><DialogHeader><DialogTitle>{viewing.name}</DialogTitle><DialogDescription>Batch details</DialogDescription></DialogHeader><dl className="grid gap-4 rounded-2xl bg-muted/40 p-4 sm:grid-cols-2"><Detail label="Teacher" value={viewing.teacherName ?? "Not set"} /><Detail label="Board" value={viewing.boardName ?? "Not set"} /><Detail label="Class" value={viewing.className ?? "Not set"} /><Detail label="Subject" value={viewing.subjectName ?? "Not set"} /><Detail label="Schedule" value={formatSchedule(viewing)} /><Detail label="Capacity" value={viewing.capacity?.toString() ?? "Not set"} /><Detail label="Room" value={viewing.room ?? "Not set"} /><Detail label="Created On" value={formatCreatedAt(viewing.createdAt)} /><Detail label="Status" value={viewing.isActive ? "Active" : "Inactive"} /></dl><DialogFooter><Button variant="outline" onClick={() => setViewing(null)}>Close</Button><Button onClick={() => { setViewing(null); openEdit(viewing); }}>Edit</Button></DialogFooter></> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open && !isDeleting) setDeleting(null); }}>
        <DialogContent>
          {deleting ? <><DialogHeader><DialogTitle>Permanently delete Batch?</DialogTitle><DialogDescription><strong>{deleting.name}</strong> will be permanently deleted. This action cannot be undone. A Batch assigned to a student cannot be deleted.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={isDeleting} onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" disabled={isDeleting} onClick={confirmDelete}>{isDeleting ? "Deleting…" : "Permanently Delete"}</Button></DialogFooter></> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
