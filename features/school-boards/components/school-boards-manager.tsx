"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  School,
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
  createSchoolBoard,
  updateSchoolBoard,
} from "@/features/school-boards/actions/school-board-actions";
import type { SchoolBoard } from "@/features/school-boards/types/school-board";
import {
  schoolBoardSchema,
  type SchoolBoardFormValues,
} from "@/features/school-boards/validations/school-board-schema";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatCreatedAt(value: string | null): string {
  if (!value) return "Not available";
  return dateFormatter.format(new Date(value));
}

function SchoolBoardFormDialog({
  open,
  board,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  board: SchoolBoard | null;
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
  } = useForm<SchoolBoardFormValues>({
    resolver: zodResolver(schoolBoardSchema),
    values: { name: board?.name ?? "" },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  const submit = handleSubmit((values) => {
    startTransition(async () => {
      const result = board
        ? await updateSchoolBoard(board.id, values)
        : await createSchoolBoard(values);

      if (result.status === "error") {
        const nameError = result.fieldErrors?.name?.[0];
        if (nameError) setError("name", { message: nameError });
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
            {board ? "Edit School Board" : "Add School Board"}
          </DialogTitle>
          <DialogDescription>
            {board
              ? "Update the name of this education board."
              : "Add an education board for your institute."}
          </DialogDescription>
        </DialogHeader>
        <form id="school-board-form" onSubmit={submit} noValidate>
          <div className="space-y-2">
            <label htmlFor="school-board-name" className="text-sm font-medium">
              Board Name
            </label>
            <Input
              id="school-board-name"
              autoFocus
              disabled={isPending}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "school-board-name-error" : undefined}
              {...register("name")}
            />
            {errors.name ? (
              <p
                id="school-board-name-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.name.message}
              </p>
            ) : null}
          </div>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="school-board-form"
            disabled={isPending}
          >
            {isPending
              ? "Saving…"
              : board
                ? "Save Changes"
                : "Add School Board"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SchoolBoardsManager({ boards }: { boards: SchoolBoard[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolBoard | null>(null);
  const [viewing, setViewing] = useState<SchoolBoard | null>(null);

  const filteredBoards = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return boards;
    return boards.filter((board) =>
      board.name.toLocaleLowerCase().includes(term)
    );
  }, [boards, search]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(board: SchoolBoard) {
    setEditing(board);
    setFormOpen(true);
  }

  function saved(message: string) {
    toast.add({ title: "Success", description: message, type: "success" });
    router.refresh();
  }

  function Actions({ board }: { board: SchoolBoard }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${board.name}`}
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setViewing(board)}>
            <Eye />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openEdit(board)}>
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
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            School Boards
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage education boards available within your institute.
          </p>
        </div>
        <Button size="lg" onClick={openCreate}>
          <Plus />
          Add School Board
        </Button>
      </div>

      <div className="max-w-md">
        <StatCard
          title="Total Boards"
          value={boards.length.toString()}
          description="Education boards in your institute"
          icon={School}
          tone="blue"
        />
      </div>

      <Card>
        <CardContent className="space-y-5 p-4 sm:p-6">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search School Boards"
              placeholder="Search by Board Name…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          {boards.length === 0 ? (
            <div className="space-y-4">
              <EmptyState
                icon={School}
                title="No School Boards have been created yet."
                description="Add the first education board for your institute."
              />
              <div className="flex justify-center">
                <Button onClick={openCreate}>
                  <Plus />
                  Add School Board
                </Button>
              </div>
            </div>
          ) : filteredBoards.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching School Boards"
              description="Try a different Board Name."
              compact
            />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Board Name</TableHead>
                      <TableHead>Created On</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBoards.map((board) => (
                      <TableRow key={board.id}>
                        <TableCell className="font-medium">
                          {board.name}
                        </TableCell>
                        <TableCell>{formatCreatedAt(board.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Actions board={board} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-3 md:hidden">
                {filteredBoards.map((board) => (
                  <div key={board.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{board.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Created {formatCreatedAt(board.createdAt)}
                        </p>
                      </div>
                      <Actions board={board} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SchoolBoardFormDialog
        open={formOpen}
        board={editing}
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
                <DialogTitle>{viewing.name}</DialogTitle>
                <DialogDescription>School Board details</DialogDescription>
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
