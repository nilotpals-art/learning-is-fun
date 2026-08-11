import { z } from "zod";
import { normalizeUpperText } from "@/lib/validation/normalization";

const uuid = z.string().uuid();
const requiredDate = z.string().min(1, "First due date is required.").date("Enter a valid due date.");
const installment = z.object({ installmentNo: z.coerce.number().int().positive(), dueDate: z.string().min(1, "Installment due date is required.").date("Enter a valid installment due date."), grossAmount: z.coerce.number().positive("Installment amount must be greater than zero.").multipleOf(0.01) });
export const feeStructureItemSchema = z.object({
  feeHeadId: uuid, amount: z.coerce.number().positive("Fee amount must be greater than zero.").multipleOf(0.01), isMandatory: z.boolean(),
  discountType: z.enum(["fixed","percentage"]).nullable(), discountValue: z.coerce.number().min(0),
  scheduleType: z.enum(["one_time","monthly","quarterly","custom"]), displayOrder: z.coerce.number().int().positive(),
  startDueDate: requiredDate.nullable(), installments: z.array(installment),
}).superRefine((value,ctx)=>{if(value.scheduleType!=="monthly"&&!value.startDueDate)ctx.addIssue({code:z.ZodIssueCode.custom,path:["startDueDate"],message:"First due date is required."});if(value.discountType==="fixed"&&value.discountValue>value.amount)ctx.addIssue({code:z.ZodIssueCode.custom,path:["discountValue"],message:"Fixed discount cannot exceed amount."});if(value.discountType==="percentage"&&value.discountValue>100)ctx.addIssue({code:z.ZodIssueCode.custom,path:["discountValue"],message:"Percentage cannot exceed 100."});if(value.scheduleType==="custom"&&Math.round(value.installments.reduce((sum,x)=>sum+x.grossAmount,0)*100)!==Math.round(value.amount*100))ctx.addIssue({code:z.ZodIssueCode.custom,path:["installments"],message:"Installment totals must equal the fee amount."});});
export const feeStructureSchema = z.object({ id: uuid.nullable(), academicYearId: uuid, classId: uuid, name: z.string().trim().min(1, "Fee Structure name is required.").transform(normalizeUpperText), isActive: z.boolean(), items: z.array(feeStructureItemSchema).min(1, "Please add at least one fee item.") });
export const admissionFeeSelectionSchema = z.object({ academicYearId: uuid, classId: uuid });
export const applyFeeStructureSchema = z.object({ studentId: uuid, structureId: uuid, overrides: z.array(z.object({ itemId: uuid, include: z.boolean(), amount: z.coerce.number().positive().multipleOf(0.01), discountType: z.preprocess((value)=>value===""?null:value,z.enum(["fixed","percentage"]).nullable()), discountValue: z.coerce.number().min(0) })) });
export type FeeStructureValues = z.infer<typeof feeStructureSchema>;
