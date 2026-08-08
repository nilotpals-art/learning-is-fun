"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Search,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/layout/page-header";
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
  createAcademicYear,
  setCurrentAcademicYear,
  toggleAcademicYearActive,
  updateAcademicYear,
} from "@/features/academic-years/actions/academic-year-actions";
import type { AcademicYear } from "@/features/academic-years/types/academic-year";
import {
  academicYearSchema,
  type AcademicYearFormValues,
} from "@/features/academic-years/validations/academic-year-schema";

type StatusFilter = "all" | "active" | "inactive";
type CurrentFilter = "all" | "current" | "not-current";
type Confirmation = { kind: "deactivate" | "current"; year: AcademicYear };

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}

function StatusBadges({ year }: { year: AcademicYear }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {year.isCurrent ? <Badge>Current</Badge> : null}
      <Badge variant={year.isActive ? "secondary" : "outline"}>
        {year.isActive ? "Active" : "Inactive"}
      </Badge>
    </div>
  );
}

function AcademicYearFormDialog({
  open,
  year,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  year: AcademicYear | null;
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
  } = useForm<AcademicYearFormValues>({
    resolver: zodResolver(academicYearSchema),
    values: {
      name: year?.name ?? "",
      startDate: year?.startDate ?? "",
      endDate: year?.endDate ?? "",
      isActive: year?.isActive ?? true,
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  const submit = handleSubmit((values) => {
    startTransition(async () => {
      const result = year
        ? await updateAcademicYear(year.id, values)
        : await createAcademicYear(values);
      if (result.status === "error") {
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            const message = messages?.[0];
            if (message) setError(field as keyof AcademicYearFormValues, { message });
          }
        }
        toast.add({ title: "Unable to save", description: result.message, type: "error" });
        return;
      }
      handleOpenChange(false);
      onSaved(result.message);
    });
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{year ? "Edit Academic Year" : "Add Academic Year"}</DialogTitle>
          <DialogDescription>
            {year
              ? "Update the academic session details. Current status is managed separately."
              : "Create a new academic session for your institute."}
          </DialogDescription>
        </DialogHeader>
        <form id="academic-year-form" onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <label htmlFor="academic-year-name" className="text-sm font-medium">Academic Year Name</label>
            <Input id="academic-year-name" autoFocus disabled={isPending} aria-invalid={Boolean(errors.name)} {...register("name")} />
            {errors.name ? <p className="text-sm text-destructive" role="alert">{errors.name.message}</p> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="academic-year-start" className="text-sm font-medium">Start Date</label>
              <Input id="academic-year-start" type="date" disabled={isPending} aria-invalid={Boolean(errors.startDate)} {...register("startDate")} />
              {errors.startDate ? <p className="text-sm text-destructive" role="alert">{errors.startDate.message}</p> : null}
            </div>
            <div className="space-y-2">
              <label htmlFor="academic-year-end" className="text-sm font-medium">End Date</label>
              <Input id="academic-year-end" type="date" disabled={isPending} aria-invalid={Boolean(errors.endDate)} {...register("endDate")} />
              {errors.endDate ? <p className="text-sm text-destructive" role="alert">{errors.endDate.message}</p> : null}
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-xl border p-3 text-sm font-medium">
            <input type="checkbox" className="size-4 accent-primary" disabled={isPending || year?.isCurrent} {...register("isActive")} />
            Active
          </label>
          {year?.isCurrent ? <p className="text-xs text-muted-foreground">The Current Academic Year must remain Active.</p> : null}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isPending} onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="academic-year-form" disabled={isPending}>{isPending ? "Saving…" : year ? "Save Changes" : "Add Academic Year"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AcademicYearsManager({ years }: { years: AcademicYear[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [current, setCurrent] = useState<CurrentFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicYear | null>(null);
  const [viewing, setViewing] = useState<AcademicYear | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredYears = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return years.filter((year) => {
      const matchesSearch = !term || year.name.toLocaleLowerCase().includes(term);
      const matchesStatus = status === "all" || (status === "active" ? year.isActive : !year.isActive);
      const matchesCurrent = current === "all" || (current === "current" ? year.isCurrent : !year.isCurrent);
      return matchesSearch && matchesStatus && matchesCurrent;
    });
  }, [current, search, status, years]);

  const currentYear = years.find((year) => year.isCurrent);
  const activeCount = years.filter((year) => year.isActive).length;

  function saved(message: string) {
    toast.add({ title: "Success", description: message, type: "success" });
    router.refresh();
  }

  function toggle(year: AcademicYear) {
    if (year.isActive) {
      setConfirmation({ kind: "deactivate", year });
      return;
    }
    startTransition(async () => {
      const result = await toggleAcademicYearActive(year.id);
      toast.add({ title: result.status === "success" ? "Success" : "Unable to update", description: result.message, type: result.status === "success" ? "success" : "error" });
      if (result.status === "success") router.refresh();
    });
  }

  function confirmAction() {
    if (!confirmation) return;
    startTransition(async () => {
      const result = confirmation.kind === "deactivate"
        ? await toggleAcademicYearActive(confirmation.year.id)
        : await setCurrentAcademicYear(confirmation.year.id);
      toast.add({ title: result.status === "success" ? "Success" : "Unable to update", description: result.message, type: result.status === "success" ? "success" : "error" });
      setConfirmation(null);
      if (result.status === "success") router.refresh();
    });
  }

  function openEdit(year: AcademicYear) {
    setEditing(year);
    setFormOpen(true);
  }

  function Actions({ year }: { year: AcademicYear }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${year.name}`} />}><MoreHorizontal /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setViewing(year)}><Eye />View</DropdownMenuItem>
          <DropdownMenuItem onClick={() => openEdit(year)}><Pencil />Edit</DropdownMenuItem>
          <DropdownMenuItem disabled={year.isCurrent && year.isActive} onClick={() => toggle(year)}><Power />{year.isActive ? "Deactivate" : "Activate"}</DropdownMenuItem>
          <DropdownMenuItem disabled={year.isCurrent || !year.isActive} onClick={() => setConfirmation({ kind: "current", year })}><CalendarCheck />Set as Current</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster />
      <PageHeader title="Academic Years" description="Manage academic sessions and select the Current Academic Year." icon={CalendarDays} theme="academic-years" eyebrow="Masters" action={<Button size="lg" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus />Add Academic Year</Button>} />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Current Academic Year" value={currentYear?.name ?? "Not set"} description={currentYear ? `${formatDate(currentYear.startDate)} – ${formatDate(currentYear.endDate)}` : "Select an Active Academic Year"} icon={CalendarCheck} tone="violet" />
        <StatCard title="Total Academic Years" value={years.length.toString()} description="Academic sessions created" icon={CalendarDays} tone="blue" />
        <StatCard title="Active Academic Years" value={activeCount.toString()} description="Available academic sessions" icon={CheckCircle2} tone="emerald" />
      </div>

      <Card>
        <CardContent className="space-y-5 p-4 sm:p-6">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_12rem]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Search Academic Years" placeholder="Search Academic Years…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
            </div>
            <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="h-9 rounded-4xl border border-border bg-input/30 px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <option value="all">Status: All</option><option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
            <select aria-label="Filter by Current status" value={current} onChange={(event) => setCurrent(event.target.value as CurrentFilter)} className="h-9 rounded-4xl border border-border bg-input/30 px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <option value="all">Current: All</option><option value="current">Current</option><option value="not-current">Not Current</option>
            </select>
          </div>

          {years.length === 0 ? (
            <div className="space-y-4">
              <EmptyState icon={CalendarDays} title="No Academic Years have been created yet" description="Create the first academic session to get started." />
              <div className="flex justify-center"><Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus />Add Academic Year</Button></div>
            </div>
          ) : filteredYears.length === 0 ? (
            <EmptyState icon={Search} title="No matching Academic Years" description="Try changing your search or filters." compact />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Start Date</TableHead><TableHead>End Date</TableHead><TableHead>Current</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>{filteredYears.map((year) => <TableRow key={year.id}><TableCell className="font-medium">{year.name}</TableCell><TableCell>{formatDate(year.startDate)}</TableCell><TableCell>{formatDate(year.endDate)}</TableCell><TableCell>{year.isCurrent ? <Badge>Current</Badge> : <span className="text-muted-foreground">—</span>}</TableCell><TableCell><Badge variant={year.isActive ? "secondary" : "outline"}>{year.isActive ? "Active" : "Inactive"}</Badge></TableCell><TableCell className="text-right"><Actions year={year} /></TableCell></TableRow>)}</TableBody>
                </Table>
              </div>
              <div className="grid gap-3 md:hidden">{filteredYears.map((year) => <div key={year.id} className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{year.name}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(year.startDate)} – {formatDate(year.endDate)}</p></div><Actions year={year} /></div><div className="mt-3"><StatusBadges year={year} /></div></div>)}</div>
            </>
          )}
        </CardContent>
      </Card>

      <AcademicYearFormDialog open={formOpen} year={editing} onOpenChange={setFormOpen} onSaved={saved} />

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => { if (!open) setViewing(null); }}>
        <DialogContent>{viewing ? <><DialogHeader><DialogTitle>{viewing.name}</DialogTitle><DialogDescription>Academic Year details</DialogDescription></DialogHeader><dl className="grid grid-cols-2 gap-4 rounded-2xl bg-muted/40 p-4"><div><dt className="text-xs text-muted-foreground">Start Date</dt><dd className="mt-1 font-medium">{formatDate(viewing.startDate)}</dd></div><div><dt className="text-xs text-muted-foreground">End Date</dt><dd className="mt-1 font-medium">{formatDate(viewing.endDate)}</dd></div><div className="col-span-2"><dt className="text-xs text-muted-foreground">Status</dt><dd className="mt-2"><StatusBadges year={viewing} /></dd></div></dl><DialogFooter><Button variant="outline" onClick={() => setViewing(null)}>Close</Button><Button onClick={() => { setViewing(null); openEdit(viewing); }}>Edit</Button></DialogFooter></> : null}</DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmation)} onOpenChange={(open) => { if (!open) setConfirmation(null); }}>
        <DialogContent>{confirmation ? <><DialogHeader><DialogTitle>{confirmation.kind === "deactivate" ? "Deactivate Academic Year?" : "Change Current Academic Year?"}</DialogTitle><DialogDescription>{confirmation.kind === "deactivate" ? `${confirmation.year.name} will no longer be available for active use.` : `${confirmation.year.name} will become Current and the previous Current Academic Year will be unset.`}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={isPending} onClick={() => setConfirmation(null)}>Cancel</Button><Button variant={confirmation.kind === "deactivate" ? "destructive" : "default"} disabled={isPending} onClick={confirmAction}>{isPending ? "Updating…" : "Confirm"}</Button></DialogFooter></> : null}</DialogContent>
      </Dialog>
    </div>
  );
}
