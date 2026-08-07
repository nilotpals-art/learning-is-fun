export interface Batch {
  id: string;
  name: string;
  teacherId: string | null;
  teacherName: string | null;
  boardId: string | null;
  boardName: string | null;
  classId: string | null;
  className: string | null;
  subjectId: string | null;
  subjectName: string | null;
  startTime: string | null;
  endTime: string | null;
  days: string | null;
  capacity: number | null;
  room: string | null;
  isActive: boolean;
  createdAt: string | null;
}

export interface BatchOption {
  id: string;
  label: string;
}

export interface BatchFormOptions {
  teachers: BatchOption[];
  boards: BatchOption[];
  classes: BatchOption[];
  subjects: BatchOption[];
}

export type BatchFieldErrors = Partial<
  Record<
    | "name"
    | "teacherId"
    | "boardId"
    | "classId"
    | "subjectId"
    | "startTime"
    | "endTime"
    | "days"
    | "capacity"
    | "room"
    | "isActive",
    string[]
  >
>;

export type BatchActionResult =
  | { status: "success"; message: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: BatchFieldErrors;
    };
