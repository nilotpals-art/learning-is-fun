import { z } from "zod";
import { normalizeEmail, normalizeTrimmedText, normalizeUpperText } from "@/lib/validation/normalization";
import { STAFF_PERMISSION_OPTIONS } from "@/lib/auth/permissions";

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

const permissionCodes = z.array(z.enum(STAFF_PERMISSION_OPTIONS.map((item) => item.code) as [string, ...string[]])).max(STAFF_PERMISSION_OPTIONS.length);
export const createStaffSchema = baseUser.extend({ role: z.enum(["Teacher", "Accountant"]), permissionCodes });
export const updateStaffSchema = createStaffSchema.omit({ email: true }).extend({ id: z.string().uuid() });
