import { ADMINISTRATOR_ROLES, isStaffRole, normalizeApplicationRole, ROLE } from "@/lib/auth/roles";
import { permissionForPath, type PermissionCode } from "@/lib/auth/permissions";

export const DASHBOARD_ROLES = ADMINISTRATOR_ROLES;

export type NavigationRole =
  | (typeof DASHBOARD_ROLES)[number]
  | typeof ROLE.STUDENT
  | typeof ROLE.PARENT
  | typeof ROLE.TEACHER
  | typeof ROLE.ACCOUNTANT;

export type NavigationIconName = "dashboard"|"calendar"|"school"|"graduation-cap"|"users"|"user-round"|"book-open"|"academics"|"attendance"|"planner"|"homework"|"exams"|"marks"|"report-card"|"finance"|"fees"|"communication"|"announcements"|"reports"|"settings"|"rollover"|"logout";
export interface NavigationItem { title:string; href:string; icon:NavigationIconName; roles:readonly NavigationRole[]; enabled:boolean; badge:string|null; children:readonly NavigationItem[] }

const allPortalRoles: readonly NavigationRole[] = [...DASHBOARD_ROLES, ROLE.STUDENT, ROLE.PARENT, ROLE.TEACHER, ROLE.ACCOUNTANT];
const item = (title:string,href:string,icon:NavigationIconName,roles:readonly NavigationRole[]=DASHBOARD_ROLES):NavigationItem => ({title,href,icon,roles,enabled:true,badge:null,children:[]});
const group = (title:string,href:string,icon:NavigationIconName,children:readonly NavigationItem[]):NavigationItem => ({title,href,icon,roles:[...new Set(children.flatMap((child)=>child.roles))],enabled:true,badge:null,children});

export const navigation: readonly NavigationItem[] = [
  group("Overview", "/dashboard", "dashboard", [item("Dashboard", "/dashboard", "dashboard")]),
  group("Academic Setup", "/masters/academic-years", "book-open", [item("Academic Years","/masters/academic-years","calendar"),item("School Boards","/masters/school-boards","school"),item("Classes","/masters/classes","graduation-cap"),item("Subjects","/masters/subjects","book-open"),item("Batches","/masters/batches","users")]),
  group("Student Management", "/students", "graduation-cap", [item("Student Master","/students","users"),item("Parent Enrollment Links","/students/enrollment-links","communication"),item("Academic Assignments","/students/academic-assignments","graduation-cap"),item("Academic Year Rollover","/students/rollover","rollover"),item("Enrollment Breaks","/students/enrollment-breaks","calendar")]),
  group("Attendance", "/attendance", "attendance", [item("Daily Attendance","/attendance","attendance"),item("Attendance History","/attendance/history","calendar"),item("Attendance Reports","/attendance/reports","reports")]),
  group("Learning Planner", "/learning-planner", "planner", [item("Calendar","/learning-planner/calendar","calendar"),item("Recurring Schedules","/learning-planner/schedules","planner"),item("Exam Results","/learning-planner/exam-results","marks"),item("Holidays","/learning-planner/holidays","calendar"),item("Notifications","/learning-planner/notifications","communication"),item("History","/learning-planner/history","reports")]),
  group("Practice Work", "/practice-work/papers", "homework", [item("Question Papers","/practice-work/papers","homework"),item("Assignments","/practice-work/assignments","users"),item("Analytics","/practice-work/analytics","reports"),item("PDF Settings","/practice-work/papers/settings","settings")]),
  group("Fees", "/fees", "fees", [item("Overview","/fees","dashboard"),item("Fee Structures","/fees/structures","academics"),item("Pending Fees","/fees/student-fees","users"),item("Collect Payment","/fees/collect","finance"),item("Payments","/fees/payments","finance"),item("Reports & Ledger","/fees/reports","reports"),item("Fee Heads","/masters/fee-heads","fees"),item("Payment Modes","/masters/payment-modes","finance"),item("WhatsApp Outbox","/fees/messages","communication"),item("Settings","/fees/settings","settings")]),
  group("Communication", "/communication/notifications", "communication", [item("Notifications","/communication/notifications","communication"),item("WhatsApp Test","/communication/whatsapp-test","communication")]),
  group("Administration", "/administration/users", "settings", [item("User Management","/administration/users","users",DASHBOARD_ROLES)]),
  item("Dashboard","/student/dashboard","dashboard",[ROLE.STUDENT]),item("My Question Papers","/practice-work/my-work","homework",[ROLE.STUDENT]),item("Send Syllabus Pages","/student/syllabus-pages","book-open",[ROLE.STUDENT]),item("My Schedule","/student/schedule","calendar",[ROLE.STUDENT]),item("My Attendance","/student/attendance","attendance",[ROLE.STUDENT]),item("My Results","/student/results","marks",[ROLE.STUDENT]),item("My Fees","/student/fees","fees",[ROLE.STUDENT]),item("Notifications","/student/notifications","communication",[ROLE.STUDENT]),item("Dashboard","/parent/dashboard","dashboard",[ROLE.PARENT]),item("My Profile","/parent/profile","user-round",[ROLE.PARENT]),item("Attendance","/parent/attendance","attendance",[ROLE.PARENT]),item("Schedule","/parent/schedule","calendar",[ROLE.PARENT]),item("Fees","/parent/fees","fees",[ROLE.PARENT]),item("Results","/parent/results","marks",[ROLE.PARENT]),item("Notifications","/parent/notifications","communication",[ROLE.PARENT]),item("Continuation","/parent/continuation","rollover",[ROLE.PARENT]),item("Logout","/logout","logout",allPortalRoles),
];

export function getNavigationForRole(role:string|null, permissions:readonly PermissionCode[]=[]):NavigationItem[] {
  const normalizedRole=normalizeApplicationRole(role);
  if(!normalizedRole)return[];
  if(isStaffRole(normalizedRole)) {
    return navigation.flatMap((navItem) => {
      if (navItem.href === "/logout") return [{...navItem,roles:[normalizedRole as NavigationRole]}];
      if (navItem.href === "/dashboard") return [{...navItem,roles:[normalizedRole as NavigationRole],children:navItem.children.map((child)=>({...child,roles:[normalizedRole as NavigationRole]}))}];
      if (navItem.href.startsWith("/administration") || navItem.href.startsWith("/student") || navItem.href.startsWith("/parent")) return [];
      const children=navItem.children.filter((child)=>{const required=permissionForPath(child.href);return required!==null&&permissions.includes(required);}).map((child)=>({...child,roles:[normalizedRole as NavigationRole]}));
      if(!children.length)return[];
      return [{...navItem,roles:[normalizedRole as NavigationRole],children}];
    });
  }
  return navigation.filter((navItem)=>navItem.roles.includes(normalizedRole as NavigationRole)).map((navItem)=>({...navItem,children:navItem.children.filter((child)=>child.roles.includes(normalizedRole as NavigationRole))}));
}

export function getComingSoonSlug(navigationItem:NavigationItem):string{return navigationItem.href.replace(/^\//,"").replaceAll("/","--")}
export function findNavigationItemBySlug(slug:string):NavigationItem|null{const items=navigation.flatMap((navItem)=>[navItem,...navItem.children]);return items.find((navItem)=>getComingSoonSlug(navItem)===slug)??null}
