export interface Subject {
  id: string;
  subjectName: string;
  createdAt: string | null;
}

export type SubjectActionResult =
  | { status: "success"; message: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<"subjectName", string[]>>;
    };
