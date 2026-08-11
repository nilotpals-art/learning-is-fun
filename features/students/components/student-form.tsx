"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { CalendarPlus, MapPin, MessageSquareText, UserRound, UsersRound } from "lucide-react";

import { FormSection } from "@/components/layout/form-section";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  createStudent,
  updateStudent,
} from "@/features/students/actions/student-actions";
import { loadAdmissionFeeStructure } from "@/features/fees/actions/fee-structure-actions";
import type { FeeStructure } from "@/features/fees/types/fee-structure";
import {
  PARENT_RELATIONSHIPS,
  STUDENT_GENDERS,
  STUDENT_STATUSES,
  type ParentConflictDetails,
  type StudentAcademicYearOption,
  type StudentClassOption,
  type StudentRecord,
} from "@/features/students/types/student";
import {
  studentCreateSchema,
  studentEditSchema,
  type StudentCreateValues,
  type StudentEditValues,
} from "@/features/students/validations/student-schema";

const fieldClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";
const textareaClass = `${fieldClass} min-h-24 resize-y py-2`;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive" role="alert">{message}</p> : null;
}

function FormField({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {children}
      <FieldError message={error} />
    </div>
  );
}

const today = new Date().toISOString().slice(0, 10);

function createDefaults(years: StudentAcademicYearOption[], classes: StudentClassOption[]): StudentCreateValues {
  return {
    name: "",
    motherName: "",
    dateOfBirth: "",
    gender: "Male",
    mobile: "",
    email: "",
    address: "",
    parentName: "",
    relationship: "Father",
    parentMobile: "",
    parentEmail: "",
    academicYearId: years.find((year) => year.isCurrent)?.id ?? years[0]?.id ?? "",
    classId: classes[0]?.id ?? "",
    feeStructureId: null,
    feeOverrides: [],
    admissionDate: today,
    status: "Active",
    comments: "",
    useExistingParentId: null,
  };
}

export function StudentForm({
  open,
  student,
  academicYears,
  classes,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  student: StudentRecord | null;
  academicYears: StudentAcademicYearOption[];
  classes: StudentClassOption[];
  onOpenChange: (open: boolean) => void;
  onSaved: (message: string) => void;
}) {
  const editing = Boolean(student);
  const [isPending, startTransition] = useTransition();
  const [conflict, setConflict] = useState<ParentConflictDetails | null>(null);
  const [feeStructure, setFeeStructure] = useState<FeeStructure | null>(null);
  const [loadedFeeSelection, setLoadedFeeSelection] = useState<string | null>(null);
  const createForm = useForm<StudentCreateValues>({
    resolver: zodResolver(studentCreateSchema),
    defaultValues: createDefaults(academicYears, classes),
  });
  const editForm = useForm<StudentEditValues>({
    resolver: zodResolver(studentEditSchema),
    defaultValues: {
      name: "",
      motherName: "",
      dateOfBirth: "",
      gender: "Male",
      mobile: "",
      address: "",
      admissionDate: today,
      status: "Active",
      comments: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (student) {
      editForm.reset({
        name: student.name,
        motherName: student.motherName ?? "",
        dateOfBirth: student.dateOfBirth,
        gender: student.gender as StudentEditValues["gender"],
        mobile: student.mobile,
        address: student.address ?? "",
        admissionDate: student.admissionDate,
        status: student.status,
        comments: student.comments ?? "",
      });
    } else {
      createForm.reset(createDefaults(academicYears, classes));
    }
  }, [academicYears, classes, createForm, editForm, open, student]);

  const selectedYear = useWatch({ control: createForm.control, name: "academicYearId" });
  const selectedClass = useWatch({ control: createForm.control, name: "classId" });
  const feeOverrides = useWatch({ control: createForm.control, name: "feeOverrides" });
  const feeSelectionKey = `${selectedYear}:${selectedClass}`;
  const feeLookupDone = loadedFeeSelection === feeSelectionKey;
  useEffect(() => {
    if (!open || editing || !selectedYear || !selectedClass) return;
    let current = true;
    loadAdmissionFeeStructure({ academicYearId: selectedYear, classId: selectedClass }).then((result) => {
      if (!current) return;
      const structure = result.status === "success" ? result.data ?? null : null;
      setFeeStructure(structure);
      setLoadedFeeSelection(`${selectedYear}:${selectedClass}`);
      createForm.setValue("feeStructureId", structure?.id ?? null);
      createForm.setValue("feeOverrides", structure?.items.map((item) => ({ itemId: item.id, include: true, amount: item.amount, discountType: item.defaultDiscountType, discountValue: item.defaultDiscountValue })) ?? []);
    });
    return () => { current = false; };
  }, [createForm, editing, open, selectedClass, selectedYear]);

  function close() {
    setConflict(null);
    setFeeStructure(null);
    setLoadedFeeSelection(null);
    onOpenChange(false);
  }

  function handleResult(result: Awaited<ReturnType<typeof createStudent>>) {
    if (result.status === "parent_conflict") {
      setConflict(result.conflict);
      return;
    }
    if (result.status === "error") {
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        const message = messages?.[0];
        if (message && field in createForm.getValues()) {
          createForm.setError(field as keyof StudentCreateValues, { message });
        }
      }
      toast.add({ title: "Unable to save", description: result.message, type: "error" });
      return;
    }
    close();
    onSaved(result.feesWarning ? `${result.message} ${result.feesWarning}` : result.message);
  }

  const submitCreate = createForm.handleSubmit((values) => {
    startTransition(async () => handleResult(await createStudent(values)));
  });
  const submitEdit = editForm.handleSubmit((values) => {
    if (!student) return;
    startTransition(async () => {
      const result = await updateStudent(student.id, values);
      if (result.status === "error") {
        toast.add({ title: "Unable to save", description: result.message, type: "error" });
        return;
      }
      close();
      onSaved(result.message);
    });
  });

  const errors = editing ? editForm.formState.errors : createForm.formState.errors;
  type CommonField = keyof StudentEditValues;
  const registerCommon = (name: CommonField) =>
    editing ? editForm.register(name) : createForm.register(name);

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && close()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Student" : "Add Student"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update Student-owned information. Identity fields remain read-only."
                : "Admission Number is generated automatically after validation."}
            </DialogDescription>
          </DialogHeader>
          <form id="student-form" onSubmit={editing ? submitEdit : submitCreate} className="space-y-6" noValidate>
            <FormSection title="Student Information" icon={UserRound} theme="students">
              {editing && student ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Admission Number"><Input value={student.admissionNumber} disabled /></FormField>
                  <FormField label="Student Email"><Input value={student.email} disabled /></FormField>
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Student Name" error={errors.name?.message}><Input disabled={isPending} {...registerCommon("name")} /></FormField>
                <FormField label="Date of Birth" error={errors.dateOfBirth?.message}><Input type="date" max={today} disabled={isPending} {...registerCommon("dateOfBirth")} /></FormField>
                <FormField label="Gender" error={errors.gender?.message}><select className={fieldClass} disabled={isPending} {...registerCommon("gender")}>{STUDENT_GENDERS.map((value) => <option key={value}>{value}</option>)}</select></FormField>
                <FormField label="Student Mobile" error={errors.mobile?.message}><Input disabled={isPending} {...registerCommon("mobile")} /></FormField>
                {!editing ? <FormField label="Student Email" error={(errors as typeof createForm.formState.errors).email?.message}><Input type="email" disabled={isPending} {...createForm.register("email")} /></FormField> : null}
              </div>
            </FormSection>

            <FormSection title="Address" icon={MapPin} theme="school-boards">
              <FormField label="Address" error={errors.address?.message}><textarea className={textareaClass} disabled={isPending} {...registerCommon("address")} /></FormField>
            </FormSection>

            <FormSection title="Parent / Guardian" icon={UsersRound} theme="classes">
              <div className="grid gap-4 sm:grid-cols-2">
                {!editing ? <FormField label="Father / Guardian Name" error={createForm.formState.errors.parentName?.message}><Input disabled={isPending} {...createForm.register("parentName")} /></FormField> : <FormField label="Father / Guardian Name"><Input value={student?.parentName ?? ""} disabled /></FormField>}
                <FormField label="Mother Name" error={errors.motherName?.message}><Input disabled={isPending} {...registerCommon("motherName")} /></FormField>
                {!editing ? <><FormField label="Relationship" error={createForm.formState.errors.relationship?.message}><select className={fieldClass} disabled={isPending} {...createForm.register("relationship")}>{PARENT_RELATIONSHIPS.map((value) => <option key={value}>{value}</option>)}</select></FormField><FormField label="Parent Mobile" error={createForm.formState.errors.parentMobile?.message}><Input disabled={isPending} {...createForm.register("parentMobile")} /></FormField><FormField label="Parent Email" error={createForm.formState.errors.parentEmail?.message}><Input type="email" disabled={isPending} {...createForm.register("parentEmail")} /></FormField></> : <><FormField label="Relationship"><Input value={student?.relationship ?? ""} disabled /></FormField><FormField label="Parent Mobile"><Input value={student?.parentMobile ?? ""} disabled /></FormField><FormField label="Parent Email"><Input value={student?.parentEmail ?? ""} disabled /></FormField></>}
              </div>
            </FormSection>

            <FormSection title="Admission" icon={CalendarPlus} theme="academic-years">
              <div className="grid gap-4 sm:grid-cols-2">
                {!editing ? <><FormField label="Academic Year" error={createForm.formState.errors.academicYearId?.message}><select className={fieldClass} disabled={isPending || academicYears.length === 0} {...createForm.register("academicYearId")}>{academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}{year.isCurrent ? " (Current)" : ""}</option>)}</select></FormField><FormField label="Class" error={createForm.formState.errors.classId?.message}><select className={fieldClass} disabled={isPending || classes.length === 0} {...createForm.register("classId")}>{classes.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}</select></FormField></> : null}
                <FormField label="Admission Date" error={errors.admissionDate?.message}><Input type="date" disabled={isPending} {...registerCommon("admissionDate")} /></FormField>
                <FormField label="Status" error={errors.status?.message}><select className={fieldClass} disabled={isPending} {...registerCommon("status")}>{STUDENT_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></FormField>
              </div>
            </FormSection>

            {!editing ? <FormSection title="Fee Structure" icon={CalendarPlus} theme="fee-heads">
              {!feeLookupDone ? <p className="text-sm text-muted-foreground">Loading the applicable Fee Structure…</p> : !feeStructure ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No fee structure configured for this class. Admission may continue; Fees will not be assigned yet.</p> : <div className="space-y-3"><div><p className="font-semibold">{feeStructure.name}</p><p className="text-sm text-muted-foreground">Monthly dues are generated automatically on the configured due day. Admissions after that day begin in the following month.</p></div>{feeStructure.items.map((item,index) => { const values=feeOverrides?.[index]; const gross=Number(values?.amount??item.amount); const discount=values?.discountType==="percentage"?gross*Number(values.discountValue??0)/100:values?.discountType==="fixed"?Number(values.discountValue??0):0; const net=Math.max(gross-discount,0); const monthly=item.scheduleType==="monthly"; return <div key={item.id} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-5"><div className="sm:col-span-2"><p className="font-medium">{item.feeHeadName}</p><p className="text-xs text-muted-foreground">{item.feeNature.replaceAll("_"," ")} · {item.isMandatory?"Mandatory":"Optional"} · {item.scheduleType.replaceAll("_"," ")}</p><p className="mt-1 text-sm font-semibold">{monthly?"Net Monthly Amount":"Net Amount"} {new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(net)}</p></div><label className="grid gap-1 text-xs">{monthly?"Recurring Amount":"Amount"}<Input type="number" min="0.01" step="0.01" disabled={isPending} {...createForm.register(`feeOverrides.${index}.amount`,{valueAsNumber:true})}/></label><label className="grid gap-1 text-xs">Discount<select className={fieldClass} disabled={isPending} {...createForm.register(`feeOverrides.${index}.discountType`, { setValueAs: (value) => value === "" ? null : value })}><option value="">None</option><option value="fixed">Fixed</option><option value="percentage">Percentage</option></select></label><div className="grid gap-2"><label className="grid gap-1 text-xs">Discount Value<Input type="number" min="0" step="0.01" disabled={isPending} {...createForm.register(`feeOverrides.${index}.discountValue`,{valueAsNumber:true})}/></label><label className="flex gap-2 text-xs"><input type="checkbox" disabled={isPending||item.isMandatory} checked={values?.include??true} onChange={event=>createForm.setValue(`feeOverrides.${index}.include`,event.target.checked)}/>{item.isMandatory?"Required":"Include"}</label></div></div>})}</div>}
            </FormSection> : null}

            <FormSection title="Comments" icon={MessageSquareText} theme="subjects">
              <FormField label="Internal Comments" error={errors.comments?.message}><textarea className={textareaClass} disabled={isPending} {...registerCommon("comments")} /></FormField>
            </FormSection>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isPending} onClick={close}>Cancel</Button>
            <Button type="submit" form="student-form" disabled={isPending || (!editing && (academicYears.length === 0 || classes.length === 0))}>{isPending ? "Saving…" : editing ? "Save Changes" : "Add Student"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(conflict)} onOpenChange={(next) => !next && setConflict(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Existing Parent found</DialogTitle><DialogDescription>This email belongs to an existing Parent with different details. Shared Parent information will not be overwritten.</DialogDescription></DialogHeader>
          {conflict ? <div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Existing Parent</p><p className="font-medium">{conflict.existingName}</p><p className="text-sm">{conflict.existingMobile}</p><p className="text-xs text-muted-foreground">{conflict.linkedChildCount} linked child(ren)</p></div><div><p className="text-xs text-muted-foreground">Entered details</p><p className="font-medium">{conflict.submittedName}</p><p className="text-sm">{conflict.submittedMobile}</p></div></div> : null}
          <DialogFooter><Button variant="outline" onClick={() => setConflict(null)}>Cancel and Correct</Button><Button disabled={isPending} onClick={() => { if (!conflict) return; const values = createForm.getValues(); startTransition(async () => handleResult(await createStudent({ ...values, useExistingParentId: conflict.parentId }))); }}>Use Existing Parent</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
