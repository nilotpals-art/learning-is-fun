export interface BatchScheduleGroup { days: number[]; startTime: string; endTime: string }
export interface BatchSchedule { id: string; dayOfWeek: number; startTime: string; endTime: string; effectiveFrom: string; effectiveTo: string | null; isActive: boolean }
export interface Batch {
  id:string; name:string; academicYearId:string|null; academicYearName:string|null; branchId:string|null; branchName:string|null;
  boardId:string|null; boardName:string|null; boardIds:string[]; boardNames:string[]; classId:string|null; className:string|null; classIds:string[]; classNames:string[]; subjectId:string|null; subjectName:string|null;
  isActive:boolean; createdAt:string|null; schedules:BatchSchedule[];
}
export interface BatchOption { id:string; label:string }
export interface BatchAcademicYearOption extends BatchOption { isCurrent:boolean; startDate:string; endDate:string }
export interface BatchFormOptions { academicYears:BatchAcademicYearOption[]; branches:BatchOption[]; boards:BatchOption[]; classes:BatchOption[]; subjects:BatchOption[] }
export interface BatchConflict { scheduleId:string; batchId:string; batchName:string; dayOfWeek:number; existingStartTime:string; existingEndTime:string; proposedStartTime:string; proposedEndTime:string }
export type BatchFieldErrors=Partial<Record<"academicYearId"|"branchId"|"boardIds"|"classIds"|"subjectId"|"name"|"effectiveFrom"|"schedules",string[]>>;
export type BatchActionResult=
 | {status:"success";message:string;batchId?:string}
 | {status:"conflict";message:string;conflicts:BatchConflict[]}
 | {status:"error";message:string;fieldErrors?:BatchFieldErrors};
