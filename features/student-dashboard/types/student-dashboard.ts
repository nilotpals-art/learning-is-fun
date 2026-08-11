import type { AttendanceTotals } from "@/features/attendance-reports/types/attendance-report";
import type {
  NotificationPriority,
  ScheduleStatus,
  ScheduleType,
} from "@/features/learning-planner/types/learning-planner";

export interface StudentDashboardIdentity {
  id: string;
  name: string;
  academicYearId: string | null;
  academicYearName: string | null;
  batchId: string | null;
  batchName: string | null;
  boardName: string | null;
  className: string | null;
}

export interface StudentQuote {
  text: string;
  author: string;
  source: "external" | "fallback";
}

export interface StudentDashboardEvent {
  id: string;
  title: string;
  subjectName: string | null;
  batchName: string | null;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  scheduleType: ScheduleType;
  status: ScheduleStatus;
}
export interface StudentHoliday { id: string; name: string; date: string; scope: "national" | "state" | "institute" | "branch" }

export interface StudentPracticeItem {
  assignmentId: string;
  title: string;
  skill: string | null;
  topic: string | null;
  status: "assigned" | "in_progress" | "completed" | "closed";
  dueAt: string | null;
  latestPercentage: number | null;
  scoreObtained: number | null;
  maxMarks: number | null;
}

export interface StudentPracticeSummary {
  pending: number;
  inProgress: number;
  completed: number;
  dueSoon: number;
  overdue: number;
  actionableItem: StudentPracticeItem | null;
}

export interface StudentPracticeProgress {
  submittedAttempts: number;
  completedSets: number;
  averagePercentage: number | null;
  latestPercentage: number | null;
  firstAttemptPercentage: number | null;
  retryImprovement: number | null;
}

export interface StudentDashboardNotification {
  recipientId: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  readAt: string | null;
  createdAt: string;
}

export interface StudentDashboardData {
  student: StudentDashboardIdentity;
  quote: StudentQuote;
  todaysEvents: StudentDashboardEvent[];
  holidays: StudentHoliday[];
  nextEvent: StudentDashboardEvent | null;
  practice: StudentPracticeSummary;
  attendance: AttendanceTotals | null;
  progress: StudentPracticeProgress;
  upcomingEvents: StudentDashboardEvent[];
  notifications: StudentDashboardNotification[];
  unreadNotifications: number;
}
