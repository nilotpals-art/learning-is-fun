import { Clock3 } from "lucide-react";

import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { EmptyState } from "@/components/dashboard/empty-state";

export function RecentActivity() {
  return (
    <DashboardSection
      title="Recent Activity"
      description="Latest updates across the institute"
    >
      <EmptyState
        icon={Clock3}
        title="No activity to display yet"
        description="Recent activities will appear here as ERP modules become available."
      />
    </DashboardSection>
  );
}
