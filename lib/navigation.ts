import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  CalendarCheck,
  Wallet,
  BarChart3,
  Shield,
  Settings,
  LogOut,
} from "lucide-react";

export const navigation = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },

  {
    title: "Masters",
    icon: BookOpen,
    children: [
      {
        title: "Academic Years",
        href: "/masters/academic-years",
      },
      {
        title: "Fee Heads",
        href: "/masters/fee-heads",
      },
      {
        title: "Payment Modes",
        href: "/masters/payment-modes",
      },
      {
        title: "Classes",
        href: "/masters/classes",
      },
      {
        title: "Subjects",
        href: "/masters/subjects",
      },
      {
        title: "Batches",
        href: "/masters/batches",
      },
    ],
  },

  {
    title: "Students",
    href: "/students",
    icon: GraduationCap,
  },

  {
    title: "Attendance",
    href: "/attendance",
    icon: CalendarCheck,
  },

  {
    title: "Fees",
    href: "/fees",
    icon: Wallet,
  },

  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
  },

  {
    title: "Administration",
    href: "/administration",
    icon: Shield,
  },

  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },

  {
    title: "Logout",
    href: "/logout",
    icon: LogOut,
  },
];