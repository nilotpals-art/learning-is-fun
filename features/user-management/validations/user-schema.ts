import { z } from "zod";
import { normalizeEmail, normalizeTrimmedText, normalizeUpperText } from "@/lib/validation/normalization";

const branch = z.union([z.string().uuid(), z.literal("")]).transform((value) => value || null);
const baseUser = z.object({
  name: z.string().trim().min(1).max(150).transform(normalizeUpperText),
  email: z.string().trim().email().transform(normalizeEmail),
  mobile: z.string().trim().min(6).max(30).transform(normalizeTrimmedText),
  branchId: branch,
  isActive: z.coerce.boolean().default(true),
});

export const createAdministratorSchema = baseUser;
export const updateAdministratorSchema = createAdministratorSchema.omit({ email: true }).extend({ id: z.string().uuid() });

const permissionCode = z.enum(["module.academic", "module.students", "module.attendance", "module.planner", "module.practice", "module.fees"]);
export const createStaffSchema = baseUser.extend({ role: z.enum(["Teacher", "Accountant"]), permissionCodes: z.array(permissionCode).max(6) });
export const updateStaffSchema = createStaffSchema.omit({ email: true }).extend({ id: z.string().uuid() });
