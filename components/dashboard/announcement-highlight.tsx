import { Megaphone } from "lucide-react";

import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { EmptyState } from "@/components/dashboard/empty-state";

export function AnnouncementHighlight() {
  return (
    <DashboardSection
      title="Announcements"
      description="Notices shared with your institute"
    >
      <EmptyState
        icon={Megaphone}
        title="No announcements yet"
        description="Published announcements will be highlighted here when the Communication module is available."
        compact
      />
    </DashboardSection>
  );
}
