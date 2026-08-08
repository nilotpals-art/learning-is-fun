"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { saveStudentAssignment } from "@/features/student-academic-assignments/actions/student-academic-assignment-actions";
import { SchoolCombobox } from "@/features/student-academic-assignments/components/school-combobox";
import { PROMOTION_TYPES, type AssignmentFormOptions, type StudentAssignment } from "@/features/student-academic-assignments/types/student-academic-assignment";
import { studentAssignmentSchema, type StudentAssignmentValues } from "@/features/student-academic-assignments/validations/student-academic-assignment-schema";

const controlClass = "flex h-10 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 disabled:opacity-50";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><label className="text-sm font-semibold">{label}</label>{children}{error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}</div>;
}

export function AssignmentForm({ open, studentId, current, options, onOpenChange, onSaved }: {
  open: boolean; studentId: string | null; current: StudentAssignment | null;
  options: AssignmentFormOptions; onOpenChange: (open: boolean) => void; onSaved: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [schools, setSchools] = useState(options.schools);
  const form = useForm<StudentAssignmentValues>({ resolver: zodResolver(studentAssignmentSchema), defaultValues: {
    studentId: "", academicYearId: "", schoolId: "", boardId: "", classId: "", batchId: "",
    effectiveFrom: new Date().toISOString().slice(0, 10), promotionType: "New Admission", remarks: "",
  }});
  useEffect(() => { if (!open) return; form.reset({
    studentId: studentId ?? current?.studentId ?? "", academicYearId: current?.academicYearId ?? options.academicYears[0]?.id ?? "",
    schoolId: current?.schoolId ?? "", boardId: current?.boardId ?? "", classId: current?.classId ?? "",
    batchId: "", effectiveFrom: new Date().toISOString().slice(0, 10),
    promotionType: current ? "Batch Transfer" : "New Admission", remarks: "",
  }); }, [current, form, open, options.academicYears, studentId]);
  const schoolId = useWatch({ control: form.control, name: "schoolId" });
  const boardId = useWatch({ control: form.control, name: "boardId" });
  const classId = useWatch({ control: form.control, name: "classId" });
  const batches = useMemo(() => options.batches.filter((batch) => batch.boardId === boardId && batch.classId === classId), [boardId, classId, options.batches]);
  useEffect(() => { if (!batches.some((batch) => batch.id === form.getValues("batchId"))) form.setValue("batchId", ""); }, [batches, form]);
  const errors = form.formState.errors;
  const submit = form.handleSubmit((values) => startTransition(async () => {
    const result = await saveStudentAssignment(values);
    if (result.status === "error") { for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) { const message = messages?.[0]; if (message) form.setError(field as keyof StudentAssignmentValues, { message }); } form.setError("root", { message: result.message }); return; }
    onOpenChange(false); onSaved(result.message);
  }));
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{current ? "Change Academic Assignment" : "Assign Student"}</DialogTitle><DialogDescription>{current ? "The Current assignment will be closed one day before the new Effective From date." : "Create the Student's first Current academic assignment."}</DialogDescription></DialogHeader><form id="assignment-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
    <Field label="Student" error={errors.studentId?.message}><select className={controlClass} disabled={pending} {...form.register("studentId")}><option value="">Select Student</option>{options.students.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>
    <Field label="Academic Year" error={errors.academicYearId?.message}><select className={controlClass} disabled={pending} {...form.register("academicYearId")}><option value="">Select Academic Year</option>{options.academicYears.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>
    <Field label="School" error={errors.schoolId?.message}><SchoolCombobox schools={schools} value={schoolId} disabled={pending} onChange={(nextSchoolId) => form.setValue("schoolId", nextSchoolId, { shouldDirty: true, shouldValidate: true })} onCreated={(school) => setSchools((currentSchools) => currentSchools.some((item) => item.id === school.id) ? currentSchools : [...currentSchools, school].sort((a, b) => a.label.localeCompare(b.label)))} /></Field>
    <Field label="Board" error={errors.boardId?.message}><select className={controlClass} disabled={pending} {...form.register("boardId")}><option value="">Select Board</option>{options.boards.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>
    <Field label="Class" error={errors.classId?.message}><select className={controlClass} disabled={pending} {...form.register("classId")}><option value="">Select Class</option>{options.classes.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>
    <Field label="Batch" error={errors.batchId?.message}><select className={controlClass} disabled={pending || !boardId || !classId} {...form.register("batchId")}><option value="">Select compatible Batch</option>{batches.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>
    <Field label="Effective From" error={errors.effectiveFrom?.message}><Input type="date" disabled={pending} {...form.register("effectiveFrom")} /></Field>
    <Field label="Promotion Type" error={errors.promotionType?.message}><select className={controlClass} disabled={pending} {...form.register("promotionType")}>{PROMOTION_TYPES.map((x) => <option key={x}>{x}</option>)}</select></Field>
    <div className="space-y-2 sm:col-span-2"><label className="text-sm font-semibold">Remarks</label><textarea className={`${controlClass} min-h-24 py-2`} disabled={pending} {...form.register("remarks")} />{errors.remarks?.message ? <p className="text-sm text-destructive">{errors.remarks.message}</p> : null}</div>
    {errors.root?.message ? <p className="text-sm text-destructive sm:col-span-2" role="alert">{errors.root.message}</p> : null}
  </form><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button><Button type="submit" form="assignment-form" disabled={pending}>{pending ? "Saving…" : current ? "Change Assignment" : "Assign Student"}</Button></DialogFooter></DialogContent></Dialog>;
}
