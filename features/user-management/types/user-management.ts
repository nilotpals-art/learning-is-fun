export interface ManagedAdministrator { id:string; name:string; email:string; mobile:string; branchId:string|null; branchName:string|null; isActive:boolean; authLinked:boolean; createdAt:string }
export interface ManagedBranch { id:string; name:string }
export interface ManagedStaff { id:string; name:string; email:string; mobile:string; branchId:string|null; branchName:string|null; role:"Teacher"|"Accountant"; isActive:boolean; authLinked:boolean; createdAt:string; permissionCodes:string[] }
export type UserManagementResult = {status:"success";message:string;id?:string}|{status:"error";message:string;fieldErrors?:Record<string,string[]>};
