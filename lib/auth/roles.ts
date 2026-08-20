export const ROLE = {
  ADMINISTRATOR: "admin",
  SUPER_ADMIN: "Super Admin",
  INSTITUTE_ADMIN: "Institute Admin",
  STUDENT: "Student",
  PARENT: "Parent",
  STAFF: "Staff",
  TEACHER: "Teacher",
  ACCOUNTANT: "Accountant",
} as const;

export type ApplicationRole = (typeof ROLE)[keyof typeof ROLE];

export const ADMINISTRATOR_ROLES = [
  ROLE.ADMINISTRATOR,
  ROLE.SUPER_ADMIN,
  ROLE.INSTITUTE_ADMIN,
] as const;

export const STAFF_ROLES = [ROLE.TEACHER, ROLE.ACCOUNTANT] as const;

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
  accountant: ROLE.ACCOUNTANT,
};

export function normalizeApplicationRole(role: string | null): ApplicationRole | null {
  if (!role) return null;
  return ROLE_ALIASES[role.trim().toLowerCase()] ?? null;
}

export function isSuperAdmin(role: string | null): boolean {
  return normalizeApplicationRole(role) === ROLE.SUPER_ADMIN;
}

export function isAdministratorRole(role: string | null): boolean {
  const normalized = normalizeApplicationRole(role);
  return normalized !== null && ADMINISTRATOR_ROLES.includes(normalized as (typeof ADMINISTRATOR_ROLES)[number]);
}

export function isStaffRole(role: string | null): boolean {
  const normalized = normalizeApplicationRole(role);
  return normalized === ROLE.TEACHER || normalized === ROLE.ACCOUNTANT;
}
