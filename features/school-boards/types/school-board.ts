export interface SchoolBoard {
  id: string;
  name: string;
  createdAt: string | null;
}

export type SchoolBoardActionResult =
  | { status: "success"; message: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<"name", string[]>>;
    };
