import { ADMINISTRATOR_ROLES, normalizeApplicationRole, ROLE } from "@/lib/auth/roles";

export const DASHBOARD_ROLES = ADMINISTRATOR_ROLES;

export type NavigationRole =
  | (typeof DASHBOARD_ROLES)[number]
  | typeof ROLE.STUDENT
  | typeof ROLE.PARENT;

export type NavigationIconName =
  | "dashboard"
  | "calendar"
  | "school"
  | "graduation-cap"
  | "users"
  | "user-round"
  | "book-open"
  | "academics"
  | "attendance"
  | "planner"
  | "homework"
  | "exams"
  | "marks"
  | "report-card"
  | "finance"
  | "fees"
  | "communication"
  | "announcements"
  | "reports"
  | "settings"
  | "logout";

export interface NavigationItem {
  title: string;
  href: string;
  icon: NavigationIconName;
  roles: readonly NavigationRole[];
  enabled: boolean;
  badge: string | null;
  children: readonly NavigationItem[];
}

const allPortalRoles: readonly NavigationRole[] = [
  ...DASHBOARD_ROLES,
  ROLE.STUDENT,
  ROLE.PARENT,
];

function item(
  title: string,
  href: string,
  icon: NavigationIconName,
  roles: readonly NavigationRole[] = DASHBOARD_ROLES
): NavigationItem {
  return { title, href, icon, roles, enabled: true, badge: null, children: [] };
}

function group(
  title: string,
  href: string,
  icon: NavigationIconName,
  children: readonly NavigationItem[]
): NavigationItem {
  const roles = [...new Set(children.flatMap((child) => child.roles))];
  return { title, href, icon, roles, enabled: true, badge: null, children };
}

export const navigation: readonly NavigationItem[] = [
  group("Overview", "/dashboard", "dashboard", [
    item("Dashboard", "/dashboard", "dashboard"),
  ]),
  group("Academic Setup", "/masters/academic-years", "book-open", [
    item("Academic Years", "/masters/academic-years", "calendar"),
    item("School Boards", "/masters/school-boards", "school"),
    item("Classes", "/masters/classes", "graduation-cap"),
    item("Subjects", "/masters/subjects", "book-open"),
    item("Batches", "/masters/batches", "users"),
  ]),
  group("Fee Configuration", "/masters/fee-heads", "settings", [
    item("Fee Heads", "/masters/fee-heads", "fees"),
    item("Payment Modes", "/masters/payment-modes", "finance"),
  ]),
  group("Student Management", "/students", "graduation-cap", [
    item("Student Master", "/students", "users"),
    item("Academic Assignments", "/students/academic-assignments", "graduation-cap"),
  ]),
  group("Attendance", "/attendance", "attendance", [
    item("Daily Attendance", "/attendance", "attendance"),
    item("Attendance History", "/attendance/history", "calendar"),
    item("Attendance Reports", "/attendance/reports", "reports"),
  ]),
  group("Learning Planner", "/learning-planner", "planner", [
    item("Overview", "/learning-planner", "dashboard"),
    item("Calendar", "/learning-planner/calendar", "calendar"),
    item("Class Schedule", "/learning-planner/schedules", "planner"),
    item("Events", "/learning-planner/events", "planner"),
    item("Holiday Settings", "/learning-planner/holidays", "calendar"),
    item("Exam Results", "/learning-planner/exam-results", "marks"),
    item("Notifications", "/learning-planner/notifications", "communication"),
    item("Schedule History", "/learning-planner/history", "reports"),
  ]),
  group("Practice Work", "/practice-work", "homework", [
    item("Overview", "/practice-work", "dashboard"),
    item("Question Bank", "/practice-work/question-bank", "book-open"),
    item("Generate Questions", "/practice-work/question-bank/generate", "homework"),
    item("Question Templates", "/practice-work/templates", "academics"),
    item("Generation History", "/practice-work/generations", "reports"),
    item("Practice Sets", "/practice-work/sets", "report-card"),
    item("Assignments", "/practice-work/assignments", "users"),
    item("Student Attempts", "/practice-work/attempts", "marks"),
    item("Analytics", "/practice-work/analytics", "reports"),
  ]),
  group("Fees", "/fees", "fees", [
    item("Overview", "/fees", "dashboard"),
    item("Fee Structures", "/fees/structures", "academics"),
    item("Student Fees", "/fees/student-fees", "users"),
    item("Collect Payment", "/fees/collect", "finance"),
    item("Payments", "/fees/payments", "finance"),
    item("Reports", "/fees/reports", "reports"),
    item("WhatsApp Outbox", "/fees/messages", "communication"),
    item("Settings", "/fees/settings", "settings"),
  ]),
  group("Administration", "/administration/users", "settings", [
    item("User Management", "/administration/users", "users", [ROLE.SUPER_ADMIN]),
  ]),
  item("Dashboard", "/student/dashboard", "dashboard", ["Student"]),
  item("My Practice Work", "/practice-work/my-work", "homework", ["Student"]),
  item("My Schedule", "/student/schedule", "calendar", ["Student"]),
  item("My Attendance", "/student/attendance", "attendance", ["Student"]),
  item("My Results", "/student/results", "marks", ["Student"]),
  item("My Fees", "/student/fees", "fees", ["Student"]),
  item("Notifications", "/student/notifications", "communication", ["Student"]),
  item("My Fees", "/parent/fees", "fees", ["Parent"]),
  item("Results", "/parent/results", "marks", ["Parent"]),
  item("Logout", "/logout", "logout", allPortalRoles),
];

export function getNavigationForRole(role: string | null): NavigationItem[] {
  const normalizedRole = normalizeApplicationRole(role);
  if (!normalizedRole) return [];
  return navigation
    .filter((navigationItem) => navigationItem.roles.includes(normalizedRole as NavigationRole))
    .map((navigationItem) => ({
      ...navigationItem,
      children: navigationItem.children.filter((child) =>
        child.roles.includes(normalizedRole as NavigationRole)
      ),
    }));
}

export function getComingSoonSlug(navigationItem: NavigationItem): string {
  return navigationItem.href.replace(/^\//, "").replaceAll("/", "--");
}

export function findNavigationItemBySlug(slug: string): NavigationItem | null {
  const items = navigation.flatMap((navigationItem) => [
    navigationItem,
    ...navigationItem.children,
  ]);
  return items.find((navigationItem) => getComingSoonSlug(navigationItem) === slug) ?? null;
}
