import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const modules = [
  { name: "Authentication", status: "Complete" },
  { name: "Masters", status: "Complete" },
  { name: "Student Admission", status: "Complete" },
  { name: "Batch Assignment", status: "Complete" },
  { name: "Attendance", status: "In Progress" },
  { name: "Learning Planner", status: "Planned" },
  { name: "Practice Work", status: "Planned" },
  { name: "Examinations", status: "Planned" },
  { name: "Reports", status: "Planned" },
  { name: "Analytics", status: "Planned" },
] as const;

const badgeClassName = {
  Complete:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  "In Progress":
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  Planned:
    "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300",
} as const;

export function ModuleStatus() {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Module Status</CardTitle>
        <p className="text-sm text-muted-foreground">
          Current ERP build sequence and development progress.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {modules.map((module) => (
            <div
              key={module.name}
              className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-3 py-2.5"
            >
              <span className="text-sm font-medium">{module.name}</span>
              <Badge variant="outline" className={badgeClassName[module.status]}>
                {module.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
