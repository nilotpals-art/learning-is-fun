export interface AcademicClass {
  id: string;
  className: string;
  displayOrder: number | null;
  createdAt: string | null;
}

export type AcademicClassActionResult =
  | { status: "success"; message: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<"className" | "displayOrder", string[]>>;
    };
