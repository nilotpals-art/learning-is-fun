"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  GraduationCap,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
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
  createAcademicClass,
  updateAcademicClass,
} from "@/features/classes/actions/class-actions";
import type { AcademicClass } from "@/features/classes/types/academic-class";
import {
  classSchema,
  type ClassFormValues,
} from "@/features/classes/validations/class-schema";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatCreatedAt(value: string | null): string {
  if (!value) return "Not available";
  return dateFormatter.format(new Date(value));
}

function formatDisplayOrder(value: number | null): string {
  return value === null ? "Not set" : value.toString();
}

function ClassFormDialog({
  open,
  academicClass,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  academicClass: AcademicClass | null;
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
  } = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    values: {
      className: academicClass?.className ?? "",
      displayOrder: academicClass?.displayOrder?.toString() ?? "",
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  const submit = handleSubmit((values) => {
    startTransition(async () => {
      const result = academicClass
        ? await updateAcademicClass(academicClass.id, values)
        : await createAcademicClass(values);

      if (result.status === "error") {
        for (const [field, messages] of Object.entries(
          result.fieldErrors ?? {}
        )) {
          const message = messages?.[0];
          if (message) {
            setError(field as keyof ClassFormValues, { message });
          }
        }
        toast.add({
          title: "Unable to save",
          description: result.message,
          type: "error",
        });
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
          <DialogTitle>
            {academicClass ? "Edit Class" : "Add Class"}
          </DialogTitle>
          <DialogDescription>
            {academicClass
              ? "Update this permanent academic level."
              : "Add a permanent academic level for your institute."}
          </DialogDescription>
        </DialogHeader>
        <form id="class-form" onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <label htmlFor="class-name" className="text-sm font-medium">
              Class Name
            </label>
            <Input
              id="class-name"
              autoFocus
              disabled={isPending}
              aria-invalid={Boolean(errors.className)}
              aria-describedby={errors.className ? "class-name-error" : undefined}
              {...register("className")}
            />
            {errors.className ? (
              <p id="class-name-error" className="text-sm text-destructive" role="alert">
                {errors.className.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label htmlFor="class-display-order" className="text-sm font-medium">
              Display Order <span className="font-normal text-muted-foreground">(Optional)</span>
            </label>
            <Input
              id="class-display-order"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              disabled={isPending}
              aria-invalid={Boolean(errors.displayOrder)}
              aria-describedby={errors.displayOrder ? "class-display-order-error" : "class-display-order-help"}
              {...register("displayOrder")}
            />
            {errors.displayOrder ? (
              <p id="class-display-order-error" className="text-sm text-destructive" role="alert">
                {errors.displayOrder.message}
              </p>
            ) : (
              <p id="class-display-order-help" className="text-xs text-muted-foreground">
                Lower numbers appear first. Leave blank when no order is set.
              </p>
            )}
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isPending} onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="class-form" disabled={isPending}>
            {isPending ? "Saving…" : academicClass ? "Save Changes" : "Add Class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClassesManager({ classes }: { classes: AcademicClass[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicClass | null>(null);
  const [viewing, setViewing] = useState<AcademicClass | null>(null);

  const filteredClasses = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return classes;
    return classes.filter((academicClass) =>
      academicClass.className.toLocaleLowerCase().includes(term)
    );
  }, [classes, search]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(academicClass: AcademicClass) {
    setEditing(academicClass);
    setFormOpen(true);
  }

  function saved(message: string) {
    toast.add({ title: "Success", description: message, type: "success" });
    router.refresh();
  }

  function Actions({ academicClass }: { academicClass: AcademicClass }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${academicClass.className}`}
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setViewing(academicClass)}>
            <Eye />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openEdit(academicClass)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster />
      <PageHeader title="Classes" description="Manage academic class levels available in your institute." icon={GraduationCap} theme="classes" eyebrow="Masters" action={<Button size="lg" onClick={openCreate}><Plus />Add Class</Button>} />

      <div className="max-w-md">
        <StatCard
          title="Total Classes"
          value={classes.length.toString()}
          description="Permanent academic levels in your institute"
          icon={GraduationCap}
          tone="violet"
        />
      </div>

      <Card>
        <CardContent className="space-y-5 p-4 sm:p-6">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search Classes"
              placeholder="Search by Class Name…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          {classes.length === 0 ? (
            <div className="space-y-4">
              <EmptyState
                icon={GraduationCap}
                title="No Classes have been created yet."
                description="Add the first academic level for your institute."
              />
              <div className="flex justify-center">
                <Button onClick={openCreate}>
                  <Plus />
                  Add Class
                </Button>
              </div>
            </div>
          ) : filteredClasses.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching Classes"
              description="Try a different Class Name."
              compact
            />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class Name</TableHead>
                      <TableHead>Display Order</TableHead>
                      <TableHead>Created On</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClasses.map((academicClass) => (
                      <TableRow key={academicClass.id}>
                        <TableCell className="font-medium">
                          {academicClass.className}
                        </TableCell>
                        <TableCell>
                          {formatDisplayOrder(academicClass.displayOrder)}
                        </TableCell>
                        <TableCell>{formatCreatedAt(academicClass.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Actions academicClass={academicClass} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-3 md:hidden">
                {filteredClasses.map((academicClass) => (
                  <div key={academicClass.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{academicClass.className}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Display Order: {formatDisplayOrder(academicClass.displayOrder)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Created {formatCreatedAt(academicClass.createdAt)}
                        </p>
                      </div>
                      <Actions academicClass={academicClass} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ClassFormDialog
        open={formOpen}
        academicClass={editing}
        onOpenChange={setFormOpen}
        onSaved={saved}
      />

      <Dialog
        open={Boolean(viewing)}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
      >
        <DialogContent>
          {viewing ? (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.className}</DialogTitle>
                <DialogDescription>Class details</DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-4 rounded-2xl bg-muted/40 p-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Display Order</dt>
                  <dd className="mt-1 font-medium">
                    {formatDisplayOrder(viewing.displayOrder)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Created On</dt>
                  <dd className="mt-1 font-medium">
                    {formatCreatedAt(viewing.createdAt)}
                  </dd>
                </div>
              </dl>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewing(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setViewing(null);
                    openEdit(viewing);
                  }}
                >
                  Edit
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
