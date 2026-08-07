import type { DashboardStat } from "@/features/dashboard/types/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const toneStyles: Record<DashboardStat["tone"], string> = {
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  emerald:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  violet:
    "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

const toneBorders: Record<DashboardStat["tone"], string> = {
  blue: "before:bg-blue-500",
  emerald: "before:bg-emerald-500",
  amber: "before:bg-amber-500",
  violet: "before:bg-violet-500",
  rose: "before:bg-rose-500",
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
  status,
}: DashboardStat) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden bg-card text-card-foreground shadow-sm transition-[box-shadow,transform] duration-200 before:absolute before:inset-y-0 before:left-0 before:w-1 motion-reduce:transition-none hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0",
        toneBorders[tone]
      )}
    >
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          {status ? (
            <p className="mt-3 text-xs font-medium text-foreground/70">{status}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-2xl",
            toneStyles[tone]
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );
}
