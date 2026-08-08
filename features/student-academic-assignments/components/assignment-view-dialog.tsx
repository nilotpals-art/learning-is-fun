"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { StudentAssignment } from "@/features/student-academic-assignments/types/student-academic-assignment";

export function AssignmentViewDialog({ assignment, onClose }: { assignment: StudentAssignment | null; onClose: () => void }) {
  if (!assignment) return null;
  const items = [["Academic Year", assignment.academicYearName], ["School", assignment.schoolName], ["Board", assignment.boardName], ["Class", assignment.className], ["Batch", assignment.batchName], ["Effective From", assignment.effectiveFrom], ["Effective To", assignment.effectiveTo ?? "Open"], ["Promotion Type", assignment.promotionType]];
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{assignment.studentName}</DialogTitle></DialogHeader><div className="flex items-center justify-between rounded-xl bg-muted/50 p-3"><span>{assignment.admissionNumber}</span><Badge variant={assignment.status === "Current" ? "default" : "secondary"}>{assignment.status}</Badge></div><dl className="grid gap-4 sm:grid-cols-2">{items.map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl>{assignment.remarks ? <div><p className="text-xs text-muted-foreground">Internal Remarks</p><p className="mt-1 whitespace-pre-wrap text-sm">{assignment.remarks}</p></div> : null}<DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter></DialogContent></Dialog>;
}
