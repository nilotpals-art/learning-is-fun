export interface ParentChild { studentId:string; studentName:string; admissionNo:string|null; className:string|null; batchName:string|null; academicYearName:string|null; }
export interface AttendanceHistoryRow { attendanceDate:string; status:string; remarks:string|null; }
export interface AttendanceMonthRecord { month:string; present:number; absent:number; late:number; leave:number; percentage:number; }
export interface AttendanceSummary { totalCount:number; presentCount:number; absentCount:number; lateCount:number; leaveCount:number; percentage:number; monthlyTrend:AttendanceMonthRecord[]; history:AttendanceHistoryRow[]; }
export interface ExamResultSummary { examTitle:string; subjectName:string|null; examDate:string; marksObtained:number; maxMarks:number; percentage:number; grade:string|null; resultIndicator:string|null; resultComment:string|null; }
export interface FeeDueSummary { totalOutstanding:number; overdueAmount:number; overdueCount:number; nextDueDate:string|null; recentPayment:{ paymentDate:string; amount:number; receiptNo:string|null }|null; }
export interface ScheduleEventSummary { id:string; title:string; eventDate:string; startTime:string|null; endTime:string|null; scheduleType:string; subjectName:string|null; batchName:string|null; status:string; }
export interface ContinuationSummary { pendingCount:number; continuingCount:number; notContinuingCount:number; }
export interface NotificationSummary { totalCount:number; unreadCount:number; recent:Array<{recipientId:string;title:string;message:string;priority:string;createdAt:string;readAt:string|null}>; }
