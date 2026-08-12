import{z}from"zod";import{normalizeEmail,normalizeTrimmedText,normalizeUpperText}from"@/lib/validation/normalization";
const branch=z.union([z.string().uuid(),z.literal("")]).transform(v=>v||null);
export const createAdministratorSchema=z.object({name:z.string().trim().min(1).max(150).transform(normalizeUpperText),email:z.string().trim().email().transform(normalizeEmail),mobile:z.string().trim().min(6).max(30).transform(normalizeTrimmedText),branchId:branch,isActive:z.coerce.boolean().default(true)});
export const updateAdministratorSchema=createAdministratorSchema.omit({email:true}).extend({id:z.string().uuid()});
