"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  BookOpen,
  Eye,
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
  createSubject,
  updateSubject,
} from "@/features/subjects/actions/subject-actions";
import type { Subject } from "@/features/subjects/types/subject";
import {
  subjectSchema,
  type SubjectFormValues,
} from "@/features/subjects/validations/subject-schema";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatCreatedAt(value: string | null): string {
  if (!value) return "Not available";
  return dateFormatter.format(new Date(value));
}

function SubjectFormDialog({
  open,
  subject,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  subject: Subject | null;
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
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    values: { subjectName: subject?.subjectName ?? "" },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  const submit = handleSubmit((values) => {
    startTransition(async () => {
      const result = subject
        ? await updateSubject(subject.id, values)
        : await createSubject(values);

      if (result.status === "error") {
        const subjectNameError = result.fieldErrors?.subjectName?.[0];
        if (subjectNameError) {
          setError("subjectName", { message: subjectNameError });
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
          <DialogTitle>{subject ? "Edit Subject" : "Add Subject"}</DialogTitle>
          <DialogDescription>
            {subject
              ? "Update the name of this academic subject."
              : "Add an academic subject for your institute."}
          </DialogDescription>
        </DialogHeader>
        <form id="subject-form" onSubmit={submit} noValidate>
          <div className="space-y-2">
            <label htmlFor="subject-name" className="text-sm font-medium">
              Subject Name
            </label>
            <Input
              id="subject-name"
              autoFocus
              disabled={isPending}
              aria-invalid={Boolean(errors.subjectName)}
              aria-describedby={errors.subjectName ? "subject-name-error" : undefined}
              {...register("subjectName")}
            />
            {errors.subjectName ? (
              <p id="subject-name-error" className="text-sm text-destructive" role="alert">
                {errors.subjectName.message}
              </p>
            ) : null}
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isPending} onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="subject-form" disabled={isPending}>
            {isPending ? "Saving…" : subject ? "Save Changes" : "Add Subject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SubjectsManager({ subjects }: { subjects: Subject[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [viewing, setViewing] = useState<Subject | null>(null);

  const filteredSubjects = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return subjects;
    return subjects.filter((subject) =>
      subject.subjectName.toLocaleLowerCase().includes(term)
    );
  }, [search, subjects]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(subject: Subject) {
    setEditing(subject);
    setFormOpen(true);
  }

  function saved(message: string) {
    toast.add({ title: "Success", description: message, type: "success" });
    router.refresh();
  }

  function Actions({ subject }: { subject: Subject }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${subject.subjectName}`}
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setViewing(subject)}>
            <Eye />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openEdit(subject)}>
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Masters</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Subjects</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage academic subjects available in your institute.
          </p>
        </div>
        <Button size="lg" onClick={openCreate}>
          <Plus />
          Add Subject
        </Button>
      </div>

      <div className="max-w-md">
        <StatCard
          title="Total Subjects"
          value={subjects.length.toString()}
          description="Academic subjects in your institute"
          icon={BookOpen}
          tone="emerald"
        />
      </div>

      <Card>
        <CardContent className="space-y-5 p-4 sm:p-6">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search Subjects"
              placeholder="Search by Subject Name…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          {subjects.length === 0 ? (
            <div className="space-y-4">
              <EmptyState
                icon={BookOpen}
                title="No Subjects have been created yet."
                description="Add the first academic subject for your institute."
              />
              <div className="flex justify-center">
                <Button onClick={openCreate}>
                  <Plus />
                  Add Subject
                </Button>
              </div>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching Subjects"
              description="Try a different Subject Name."
              compact
            />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject Name</TableHead>
                      <TableHead>Created On</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubjects.map((subject) => (
                      <TableRow key={subject.id}>
                        <TableCell className="font-medium">
                          {subject.subjectName}
                        </TableCell>
                        <TableCell>{formatCreatedAt(subject.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Actions subject={subject} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-3 md:hidden">
                {filteredSubjects.map((subject) => (
                  <div key={subject.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{subject.subjectName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Created {formatCreatedAt(subject.createdAt)}
                        </p>
                      </div>
                      <Actions subject={subject} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SubjectFormDialog
        open={formOpen}
        subject={editing}
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
                <DialogTitle>{viewing.subjectName}</DialogTitle>
                <DialogDescription>Subject details</DialogDescription>
              </DialogHeader>
              <dl className="rounded-2xl bg-muted/40 p-4">
                <dt className="text-xs text-muted-foreground">Created On</dt>
                <dd className="mt-1 font-medium">
                  {formatCreatedAt(viewing.createdAt)}
                </dd>
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
