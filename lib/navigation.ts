export const DASHBOARD_ROLES = [
  "admin",
  "Super Admin",
  "Institute Admin",
] as const;

export type NavigationRole =
  | (typeof DASHBOARD_ROLES)[number]
  | "Student"
  | "Parent";

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
  "Student",
  "Parent",
];

function futureItem(
  title: string,
  href: string,
  icon: NavigationIconName,
  roles: readonly NavigationRole[] = DASHBOARD_ROLES
): NavigationItem {
  return {
    title,
    href,
    icon,
    roles,
    enabled: false,
    badge: "Coming Soon",
    children: [],
  };
}

export const navigation: readonly NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "dashboard",
    roles: allPortalRoles,
    enabled: true,
    badge: null,
    children: [],
  },
  {
    title: "Masters",
    href: "/masters",
    icon: "book-open",
    roles: DASHBOARD_ROLES,
    enabled: true,
    badge: null,
    children: [
      {
        title: "Academic Years",
        href: "/masters/academic-years",
        icon: "calendar",
        roles: DASHBOARD_ROLES,
        enabled: true,
        badge: null,
        children: [],
      },
      {
        title: "School Boards",
        href: "/masters/school-boards",
        icon: "school",
        roles: DASHBOARD_ROLES,
        enabled: true,
        badge: null,
        children: [],
      },
      {
        title: "Classes",
        href: "/masters/classes",
        icon: "graduation-cap",
        roles: DASHBOARD_ROLES,
        enabled: true,
        badge: null,
        children: [],
      },
      {
        title: "Subjects",
        href: "/masters/subjects",
        icon: "book-open",
        roles: DASHBOARD_ROLES,
        enabled: true,
        badge: null,
        children: [],
      },
      {
        title: "Batches",
        href: "/masters/batches",
        icon: "users",
        roles: DASHBOARD_ROLES,
        enabled: true,
        badge: null,
        children: [],
      },
      {
        title: "Fee Heads",
        href: "/masters/fee-heads",
        icon: "fees",
        roles: DASHBOARD_ROLES,
        enabled: true,
        badge: null,
        children: [],
      },
      {
        title: "Payment Modes",
        href: "/masters/payment-modes",
        icon: "finance",
        roles: DASHBOARD_ROLES,
        enabled: true,
        badge: null,
        children: [],
      },
    ],
  },
  {
    title: "Students",
    href: "/students",
    icon: "graduation-cap",
    roles: DASHBOARD_ROLES,
    enabled: true,
    badge: null,
    children: [
      {
        title: "Student Master",
        href: "/students",
        icon: "users",
        roles: DASHBOARD_ROLES,
        enabled: true,
        badge: null,
        children: [],
      },
      {
        title: "Academic Assignments",
        href: "/students/academic-assignments",
        icon: "graduation-cap",
        roles: DASHBOARD_ROLES,
        enabled: true,
        badge: null,
        children: [],
      },
    ],
  },
  futureItem("Parents", "/parents", "user-round"),
  {
    title: "Academics",
    href: "/academics",
    icon: "academics",
    roles: DASHBOARD_ROLES,
    enabled: false,
    badge: "Coming Soon",
    children: [
      futureItem("Attendance", "/attendance", "attendance"),
      futureItem("Homework", "/homework", "homework"),
      futureItem("Examinations", "/examinations", "exams"),
      futureItem("Marks", "/marks", "marks"),
      futureItem("Report Cards", "/report-cards", "report-card"),
    ],
  },
  {
    title: "Finance",
    href: "/finance",
    icon: "finance",
    roles: DASHBOARD_ROLES,
    enabled: false,
    badge: "Coming Soon",
    children: [futureItem("Fees", "/fees", "fees")],
  },
  {
    title: "Communication",
    href: "/communication",
    icon: "communication",
    roles: DASHBOARD_ROLES,
    enabled: false,
    badge: "Coming Soon",
    children: [futureItem("Announcements", "/announcements", "announcements")],
  },
  futureItem("Reports", "/reports", "reports"),
  futureItem("Settings", "/settings", "settings"),
  {
    title: "Logout",
    href: "/logout",
    icon: "logout",
    roles: allPortalRoles,
    enabled: true,
    badge: null,
    children: [],
  },
];

export function getNavigationForRole(role: string | null): NavigationItem[] {
  if (!role) return [];

  return navigation
    .filter((item) => item.roles.includes(role as NavigationRole))
    .map((item) => ({
      ...item,
      children: item.children.filter((child) =>
        child.roles.includes(role as NavigationRole)
      ),
    }));
}

export function getComingSoonSlug(item: NavigationItem): string {
  return item.href.replace(/^\//, "").replaceAll("/", "--");
}

export function findNavigationItemBySlug(
  slug: string
): NavigationItem | null {
  const items = navigation.flatMap((item) => [item, ...item.children]);
  return items.find((item) => getComingSoonSlug(item) === slug) ?? null;
}
