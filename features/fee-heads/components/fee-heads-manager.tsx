"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CircleDollarSign,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Tags,
  ToggleLeft,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";

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
  createFeeHead,
  updateFeeHead,
} from "@/features/fee-heads/actions/fee-head-actions";
import type { FeeHead } from "@/features/fee-heads/types/fee-head";
import {
  FEE_HEAD_CATEGORIES,
  feeHeadSchema,
  type FeeHeadFormValues,
} from "@/features/fee-heads/validations/fee-head-schema";

type StatusFilter = "all" | "active" | "inactive";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const selectClassName =
  "h-9 w-full rounded-4xl border border-input bg-input/30 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

function formatDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : "Not available";
}

function isPredefinedCategory(category: string): boolean {
  return FEE_HEAD_CATEGORIES.some(
    (candidate) => candidate !== "Other" && candidate === category
  );
}

function formValues(feeHead: FeeHead | null): FeeHeadFormValues {
  const predefined = feeHead ? isPredefinedCategory(feeHead.category) : true;
  return {
    name: feeHead?.name ?? "",
    code: feeHead?.code ?? "",
    categoryChoice: feeHead
      ? predefined
        ? (feeHead.category as FeeHeadFormValues["categoryChoice"])
        : "Other"
      : "Academic",
    customCategory: feeHead && !predefined ? feeHead.category : "",
    displayOrder: feeHead?.displayOrder.toString() ?? "1",
    isActive: feeHead?.isActive ?? true,
  };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} role="alert" className="text-sm text-destructive">{message}</p> : null;
}

function FeeHeadFormDialog({
  open,
  feeHead,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  feeHead: FeeHead | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (message: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors },
  } = useForm<FeeHeadFormValues>({
    resolver: zodResolver(feeHeadSchema),
    values: formValues(feeHead),
  });
  const categoryChoice = useWatch({ control, name: "categoryChoice" });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  const submit = handleSubmit((values) => {
    startTransition(async () => {
      const result = feeHead
        ? await updateFeeHead(feeHead.id, values)
        : await createFeeHead(values);

      if (result.status === "error") {
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          const message = messages?.[0];
          if (message) setError(field as keyof FeeHeadFormValues, { message });
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{feeHead ? "Edit Fee Head" : "Add Fee Head"}</DialogTitle>
          <DialogDescription>
            {feeHead ? "Update this reusable fee category." : "Add a reusable fee category for your institute."}
          </DialogDescription>
        </DialogHeader>
        <form id="fee-head-form" onSubmit={submit} noValidate className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="fee-head-name" className="text-sm font-medium">Fee Head Name</label>
              <Input id="fee-head-name" autoFocus disabled={isPending} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "fee-head-name-error" : undefined} {...register("name")} />
              <FieldError id="fee-head-name-error" message={errors.name?.message} />
            </div>
            <div className="space-y-2">
              <label htmlFor="fee-head-code" className="text-sm font-medium">Code</label>
              <Input id="fee-head-code" disabled={isPending} autoCapitalize="characters" className="uppercase" aria-invalid={Boolean(errors.code)} aria-describedby={errors.code ? "fee-head-code-error" : undefined} {...register("code")} />
              <FieldError id="fee-head-code-error" message={errors.code?.message} />
            </div>
            <div className="space-y-2">
              <label htmlFor="fee-head-display-order" className="text-sm font-medium">Display Order</label>
              <Input id="fee-head-display-order" inputMode="numeric" disabled={isPending} aria-invalid={Boolean(errors.displayOrder)} aria-describedby={errors.displayOrder ? "fee-head-display-order-error" : undefined} {...register("displayOrder")} />
              <FieldError id="fee-head-display-order-error" message={errors.displayOrder?.message} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="fee-head-category" className="text-sm font-medium">Category</label>
              <select id="fee-head-category" disabled={isPending} className={selectClassName} aria-invalid={Boolean(errors.categoryChoice)} {...register("categoryChoice")}>
                {FEE_HEAD_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <FieldError id="fee-head-category-error" message={errors.categoryChoice?.message} />
            </div>
            {categoryChoice === "Other" ? (
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="fee-head-custom-category" className="text-sm font-medium">Custom Category</label>
                <Input id="fee-head-custom-category" disabled={isPending} aria-invalid={Boolean(errors.customCategory)} aria-describedby={errors.customCategory ? "fee-head-custom-category-error" : undefined} {...register("customCategory")} />
                <FieldError id="fee-head-custom-category-error" message={errors.customCategory?.message} />
              </div>
            ) : null}
          </div>
          <label className="flex items-center gap-3 rounded-2xl border p-3 text-sm font-medium">
            <input type="checkbox" className="size-4 accent-primary" disabled={isPending} {...register("isActive")} />
            Active Fee Head
          </label>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isPending} onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="fee-head-form" disabled={isPending}>{isPending ? "Saving…" : feeHead ? "Save Changes" : "Add Fee Head"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>;
}

export function FeeHeadsManager({ feeHeads }: { feeHeads: FeeHead[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FeeHead | null>(null);
  const [viewing, setViewing] = useState<FeeHead | null>(null);

  const categories = useMemo(
    () => [...new Set(feeHeads.map((feeHead) => feeHead.category))].sort(),
    [feeHeads]
  );
  const filteredFeeHeads = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return feeHeads.filter((feeHead) => {
      const matchesSearch = !term || feeHead.name.toLocaleLowerCase().includes(term) || feeHead.code.toLocaleLowerCase().includes(term);
      const matchesCategory = category === "all" || feeHead.category === category;
      const matchesStatus = status === "all" || (status === "active" ? feeHead.isActive : !feeHead.isActive);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [category, feeHeads, search, status]);
  const activeCount = feeHeads.filter((feeHead) => feeHead.isActive).length;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(feeHead: FeeHead) {
    setEditing(feeHead);
    setFormOpen(true);
  }

  function saved(message: string) {
    toast.add({ title: "Success", description: message, type: "success" });
    router.refresh();
  }

  function Actions({ feeHead }: { feeHead: FeeHead }) {
    return <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${feeHead.name}`} />}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setViewing(feeHead)}><Eye />View</DropdownMenuItem><DropdownMenuItem onClick={() => openEdit(feeHead)}><Pencil />Edit</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
  }

  return (
    <>
      <Toaster />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-medium text-primary">Masters</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Fee Heads</h1><p className="mt-2 text-sm text-muted-foreground">Manage fee categories used by your institute.</p></div>
          <Button size="lg" onClick={openCreate}><Plus />Add Fee Head</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Total Fee Heads" value={feeHeads.length.toString()} description="Reusable fee categories" icon={CircleDollarSign} tone="blue" />
          <StatCard title="Active Fee Heads" value={activeCount.toString()} description="Available for fee assignment" icon={Tags} tone="emerald" />
          <StatCard title="Inactive Fee Heads" value={(feeHeads.length - activeCount).toString()} description="Unavailable for new assignment" icon={ToggleLeft} tone="amber" />
        </div>

        <Card>
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input aria-label="Search Fee Heads" placeholder="Search by Name or Code…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
              </div>
              <select aria-label="Filter by Category" className={selectClassName} value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All Categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <select aria-label="Filter by Status" className={selectClassName} value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}><option value="all">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
            </div>

            {feeHeads.length === 0 ? (
              <div className="space-y-4"><EmptyState icon={CircleDollarSign} title="No Fee Heads have been created yet." description="Add the first fee category for your institute." /><div className="flex justify-center"><Button onClick={openCreate}><Plus />Add Fee Head</Button></div></div>
            ) : filteredFeeHeads.length === 0 ? (
              <EmptyState icon={Search} title="No matching Fee Heads" description="Try changing your search or filters." compact />
            ) : (
              <>
                <div className="hidden md:block">
                  <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Category</TableHead><TableHead>Display Order</TableHead><TableHead>Assigned</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{filteredFeeHeads.map((feeHead) => <TableRow key={feeHead.id}><TableCell className="font-medium">{feeHead.name}</TableCell><TableCell><Badge variant="outline">{feeHead.code}</Badge></TableCell><TableCell>{feeHead.category}</TableCell><TableCell>{feeHead.displayOrder}</TableCell><TableCell><Badge variant={feeHead.assigned ? "secondary" : "outline"}>{feeHead.assigned ? "Assigned" : "Not Assigned"}</Badge></TableCell><TableCell><Badge variant={feeHead.isActive ? "secondary" : "outline"}>{feeHead.isActive ? "Active" : "Inactive"}</Badge></TableCell><TableCell className="text-right"><Actions feeHead={feeHead} /></TableCell></TableRow>)}</TableBody></Table>
                </div>
                <div className="grid gap-3 md:hidden">{filteredFeeHeads.map((feeHead) => <div key={feeHead.id} className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{feeHead.name}</p><div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant="outline">{feeHead.code}</Badge><Badge variant={feeHead.assigned ? "secondary" : "outline"}>{feeHead.assigned ? "Assigned" : "Not Assigned"}</Badge><Badge variant={feeHead.isActive ? "secondary" : "outline"}>{feeHead.isActive ? "Active" : "Inactive"}</Badge></div></div><Actions feeHead={feeHead} /></div><p className="mt-3 text-sm text-muted-foreground">{feeHead.category}</p><p className="mt-1 text-xs text-muted-foreground">Display Order: {feeHead.displayOrder}</p></div>)}</div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <FeeHeadFormDialog open={formOpen} feeHead={editing} onOpenChange={setFormOpen} onSaved={saved} />

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => { if (!open) setViewing(null); }}>
        <DialogContent>{viewing ? <><DialogHeader><DialogTitle>{viewing.name}</DialogTitle><DialogDescription>Fee Head details</DialogDescription></DialogHeader><dl className="grid gap-4 rounded-2xl bg-muted/40 p-4 sm:grid-cols-2"><Detail label="Code" value={viewing.code} /><Detail label="Category" value={viewing.category} /><Detail label="Display Order" value={viewing.displayOrder.toString()} /><Detail label="Assigned" value={viewing.assigned ? "Assigned" : "Not Assigned"} /><Detail label="Status" value={viewing.isActive ? "Active" : "Inactive"} /><Detail label="Created On" value={formatDate(viewing.createdAt)} /><Detail label="Updated On" value={formatDate(viewing.updatedAt)} /></dl><DialogFooter><Button variant="outline" onClick={() => setViewing(null)}>Close</Button><Button onClick={() => { setViewing(null); openEdit(viewing); }}>Edit</Button></DialogFooter></> : null}</DialogContent>
      </Dialog>
    </>
  );
}
