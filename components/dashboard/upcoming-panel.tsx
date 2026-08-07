import { Bell, BookOpenText, CalendarDays, NotebookTabs } from "lucide-react";

import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { Badge } from "@/components/ui/badge";

const categories = [
  { title: "Classes", icon: CalendarDays },
  { title: "Homework deadlines", icon: BookOpenText },
  { title: "Exams", icon: NotebookTabs },
  { title: "Announcements", icon: Bell },
] as const;

export function UpcomingPanel() {
  return (
    <DashboardSection
      title="Upcoming"
      description="What’s ahead across your institute"
      action={<Badge variant="secondary">Today</Badge>}
      contentClassName="space-y-2"
    >
      {categories.map(({ title, icon: Icon }) => (
        <div key={title} className="flex items-center gap-3 rounded-xl border bg-background/60 p-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <span className="flex-1 text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">Nothing scheduled</span>
        </div>
      ))}
    </DashboardSection>
  );
}
