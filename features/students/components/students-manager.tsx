"use client";

import { BookOpenCheck, Eye, GraduationCap, MoreHorizontal, Pencil, Plus, Search, Trash2, UserCheck, UserX } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster, toast } from "@/components/ui/toast";
import { deleteStudent } from "@/features/students/actions/student-actions";
import { StudentForm } from "@/features/students/components/student-form";
import { StudentViewDialog } from "@/features/students/components/student-view-dialog";
import type { StudentAssignment } from "@/features/student-academic-assignments/types/student-academic-assignment";
import { STUDENT_STATUSES, type StudentAcademicYearOption, type StudentClassOption, type StudentRecord, type StudentStatus } from "@/features/students/types/student";

const dateFormatter = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
function formatDate(value: string) { return dateFormatter.format(new Date(`${value}T00:00:00`)); }

type StatusFilter = "Current" | "All" | StudentStatus;

function StatusBadge({ status }: { status: StudentStatus }) {
  const tone = {
    Active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Inactive: "border-slate-200 bg-slate-100 text-slate-700",
    Completed: "border-blue-200 bg-blue-50 text-blue-700",
    Left: "border-rose-200 bg-rose-50 text-rose-700",
  } satisfies Record<StudentStatus, string>;

  return <Badge variant="outline" className={tone[status]}>{status}</Badge>;
}

export function StudentsManager({ students, academicYears, classes, assignments }: { students: StudentRecord[]; academicYears: StudentAcademicYearOption[]; classes: StudentClassOption[]; assignments: StudentAssignment[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("Current");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRecord | null>(null);
  const [viewing, setViewing] = useState<StudentRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return students.filter((student) => {
      if (status === "Current" && student.status === "Left") return false;
      if (status !== "Current" && status !== "All" && student.status !== status) return false;
      if (!term) return true;
      return [student.admissionNumber, student.name, student.email, student.mobile, student.parentName, student.parentEmail, student.parentMobile].some((value) => value.toLocaleLowerCase().includes(term));
    });
  }, [search, status, students]);

  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(student: StudentRecord) { setViewing(null); setEditing(student); setFormOpen(true); }
  function saved(message: string) { toast.add({ title: "Success", description: message, type: "success" }); router.refresh(); }

  function removeStudent(student: StudentRecord) {
    const confirmed = window.confirm(
      `Permanently delete ${student.name} (${student.admissionNumber})?\n\nUse Delete only when the child was enrolled but NEVER JOINED the institute. Students who attended classes or have real academic/fee history should be marked Left instead. This action cannot be undone.`
    );
    if (!confirmed) return;
    setDeletingId(student.id);
    startTransition(async () => {
      const result = await deleteStudent(student.id);
      toast.add({
        title: result.status === "success" ? "Student deleted" : "Unable to delete",
        description: result.message,
        type: result.status === "success" ? "success" : "error",
      });
      setDeletingId(null);
      if (result.status === "success") router.refresh();
    });
  }

  function Actions({ student }: { student: StudentRecord }) {
    return <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${student.name}`} />}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setViewing(student)}><Eye />View</DropdownMenuItem><DropdownMenuItem onClick={() => openEdit(student)}><Pencil />Edit</DropdownMenuItem><DropdownMenuItem onClick={() => router.push(`/students/academic-assignments?student=${student.id}`)}><BookOpenCheck />Manage Academic Assignment</DropdownMenuItem><DropdownMenuItem variant="destructive" disabled={pending && deletingId === student.id} onClick={() => removeStudent(student)}><Trash2 />{deletingId === student.id ? "Deleting…" : "Delete Enrollment"}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
  }

  const active = students.filter((student) => student.status === "Active").length;
  const inactive = students.filter((student) => student.status === "Inactive").length;
  return <div className="space-y-6"><Toaster /><PageHeader title="Students" description="Manage students, parents and admission details." icon={GraduationCap} theme="students" action={<Button size="lg" onClick={openCreate} disabled={academicYears.length === 0 || classes.length === 0}><Plus />Add Student</Button>} />
    <div className="grid gap-4 sm:grid-cols-3"><StatCard title="Total Students" value={students.length.toString()} description="Students in your institute" icon={GraduationCap} tone="blue" /><StatCard title="Active Students" value={active.toString()} description="Currently active" icon={UserCheck} tone="emerald" /><StatCard title="Inactive Students" value={inactive.toString()} description="Currently inactive" icon={UserX} tone="amber" /></div>
    {academicYears.length === 0 ? <Card><CardContent className="p-4 text-sm text-destructive">Create or activate an Academic Year before admitting a Student.</CardContent></Card> : null}
    <Card><CardContent className="space-y-5 p-4 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search Students" placeholder="Search admission number, Student or Parent…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" /></div><select aria-label="Filter by status" className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}><option value="Current">Current Students</option><option value="All">All Students</option>{STUDENT_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
      {status === "Current" ? <p className="text-xs text-muted-foreground">Students marked Left are hidden from the default list. Choose Left or All Students whenever you need to view them.</p> : null}
      {students.length === 0 ? <div className="space-y-4"><EmptyState icon={GraduationCap} title="No Students have been created yet." description="Add the first Student for your institute." /><div className="flex justify-center"><Button onClick={openCreate} disabled={academicYears.length === 0 || classes.length === 0}><Plus />Add Student</Button></div></div> : filtered.length === 0 ? <EmptyState icon={Search} title="No matching Students" description="Try another search or status filter." compact /> : <><div className="hidden overflow-x-auto lg:block"><Table><TableHeader><TableRow><TableHead>Admission Number</TableHead><TableHead>Student</TableHead><TableHead>Contact</TableHead><TableHead>Parent / Guardian</TableHead><TableHead>Admission Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{filtered.map((student) => <TableRow key={student.id}><TableCell className="font-medium">{student.admissionNumber}</TableCell><TableCell><p className="font-medium">{student.name}</p><p className="text-xs text-muted-foreground">{student.email}</p></TableCell><TableCell>{student.mobile}</TableCell><TableCell><p>{student.parentName}</p><p className="text-xs text-muted-foreground">{student.parentEmail}</p></TableCell><TableCell>{formatDate(student.admissionDate)}</TableCell><TableCell><StatusBadge status={student.status} /></TableCell><TableCell className="text-right"><Actions student={student} /></TableCell></TableRow>)}</TableBody></Table></div><div className="grid gap-3 lg:hidden">{filtered.map((student) => <div key={student.id} className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{student.name}</p><p className="text-xs text-muted-foreground">{student.admissionNumber}</p></div><Actions student={student} /></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p><span className="text-muted-foreground">Student:</span> {student.email}</p><p><span className="text-muted-foreground">Mobile:</span> {student.mobile}</p><p><span className="text-muted-foreground">Parent:</span> {student.parentName}</p><p><span className="text-muted-foreground">Parent Email:</span> {student.parentEmail}</p><p><span className="text-muted-foreground">Admission:</span> {formatDate(student.admissionDate)}</p><StatusBadge status={student.status} /></div></div>)}</div></>}
    </CardContent></Card>
    <StudentForm open={formOpen} student={editing} academicYears={academicYears} classes={classes} onOpenChange={setFormOpen} onSaved={saved} />
    <StudentViewDialog student={viewing} assignments={viewing ? assignments.filter((assignment) => assignment.studentId === viewing.id) : []} onClose={() => setViewing(null)} onEdit={openEdit} />
  </div>;
}
