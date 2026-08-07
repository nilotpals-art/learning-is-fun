export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export type AcademicYearFieldErrors = Partial<
  Record<"name" | "startDate" | "endDate" | "isActive", string[]>
>;

export type AcademicYearActionResult =
  | { status: "success"; message: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: AcademicYearFieldErrors;
    };
