import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function DashboardSection({
  title,
  description,
  children,
  action,
  className,
  contentClassName,
}: DashboardSectionProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-indigo-100/80 bg-card text-card-foreground shadow-sm transition-[box-shadow,transform] duration-200 motion-reduce:transition-none hover:-translate-y-0.5 hover:shadow-lg",
        className
      )}
    >
      <CardHeader className="flex-row items-start justify-between gap-4 border-b border-indigo-100/70 bg-gradient-to-r from-indigo-50/80 to-transparent">
        <div className="space-y-1.5">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
