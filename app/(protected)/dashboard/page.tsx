import {
  GraduationCap,
  Users,
  CalendarCheck,
  IndianRupee,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const stats = [
  {
    title: "Students",
    value: "0",
    icon: GraduationCap,
    color: "bg-blue-500",
  },
  {
    title: "Parents",
    value: "0",
    icon: Users,
    color: "bg-purple-500",
  },
  {
    title: "Today's Attendance",
    value: "0%",
    icon: CalendarCheck,
    color: "bg-green-500",
  },
  {
    title: "Fee Collection",
    value: "₹0",
    icon: IndianRupee,
    color: "bg-orange-500",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-500">
          Welcome to Learning Is Fun Student Management System
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.title}>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm text-gray-500">{item.title}</p>
                  <h2 className="mt-2 text-3xl font-bold">{item.value}</h2>
                </div>

                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full text-white ${item.color}`}
                >
                  <Icon className="h-7 w-7" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="flex h-80 items-center justify-center">
            <span className="text-gray-500">
              Attendance Chart (Coming Soon)
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-80 items-center justify-center">
            <span className="text-gray-500">
              Fee Collection Chart (Coming Soon)
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold">
              Recent Admissions
            </h3>

            <p className="text-gray-500">
              No admissions yet.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold">
              Quick Actions
            </h3>

            <div className="space-y-3">
              <button className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700">
                ➕ Add Student
              </button>

              <button className="w-full rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700">
                📅 Mark Attendance
              </button>

              <button className="w-full rounded-lg bg-orange-500 px-4 py-3 font-medium text-white hover:bg-orange-600">
                💰 Collect Fee
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}