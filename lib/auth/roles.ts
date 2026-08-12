export const ROLE = {
  ADMINISTRATOR: "admin",
  SUPER_ADMIN: "Super Admin",
  INSTITUTE_ADMIN: "Institute Admin",
  STUDENT: "Student",
  PARENT: "Parent",
  STAFF: "Staff",
  TEACHER: "Teacher",
} as const;

export type ApplicationRole = (typeof ROLE)[keyof typeof ROLE];

export const ADMINISTRATOR_ROLES = [
  ROLE.ADMINISTRATOR,
  ROLE.SUPER_ADMIN,
  ROLE.INSTITUTE_ADMIN,
] as const;

const ROLE_ALIASES: Readonly<Record<string, ApplicationRole>> = {
  admin: ROLE.ADMINISTRATOR,
  administrator: ROLE.ADMINISTRATOR,
  "super admin": ROLE.SUPER_ADMIN,
  super_admin: ROLE.SUPER_ADMIN,
  superadmin: ROLE.SUPER_ADMIN,
  "institute admin": ROLE.INSTITUTE_ADMIN,
  institute_admin: ROLE.INSTITUTE_ADMIN,
  student: ROLE.STUDENT,
  parent: ROLE.PARENT,
  staff: ROLE.STAFF,
  teacher: ROLE.TEACHER,
};

export function normalizeApplicationRole(role: string | null): ApplicationRole | null {
  if (!role) return null;
  return ROLE_ALIASES[role.trim().toLowerCase()] ?? null;
}

export function isSuperAdmin(role: string | null): boolean {
  return normalizeApplicationRole(role) === ROLE.SUPER_ADMIN;
}
