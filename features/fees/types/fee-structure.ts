export type FeeNature = "regular" | "one_time" | "refundable_deposit";
export type FeeScheduleType = "one_time" | "monthly" | "quarterly" | "custom";

export interface FeeStructureInstallment { installmentNo: number; dueDate: string; grossAmount: number }
export interface FeeStructureItem {
  id: string; feeHeadId: string; feeHeadName: string; feeNature: FeeNature; amount: number;
  isMandatory: boolean; defaultDiscountType: "fixed" | "percentage" | null; defaultDiscountValue: number;
  scheduleType: FeeScheduleType; displayOrder: number; installments: FeeStructureInstallment[];
}
export interface FeeStructure {
  id: string; name: string; academicYearId: string; academicYearName: string; classId: string; className: string;
  isActive: boolean; isInUse: boolean; items: FeeStructureItem[]; updatedAt: string;
}
export interface FeeStructureOption { id: string; name: string }
export interface AdmissionFeeOverride { itemId: string; include: boolean; amount: number; discountType: "fixed" | "percentage" | null; discountValue: number }
export type FeeStructureActionResult<T = undefined> = { status: "success"; message: string; data?: T } | { status: "error"; message: string; fieldErrors?: Record<string,string[]> };
