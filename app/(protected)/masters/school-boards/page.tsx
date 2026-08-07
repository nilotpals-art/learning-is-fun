import { redirect } from "next/navigation";

import { SchoolBoardsManager } from "@/features/school-boards/components/school-boards-manager";
import { listSchoolBoards } from "@/features/school-boards/services/school-board-service";
import { requireRole } from "@/lib/auth/services/auth-service";
import { DASHBOARD_ROLES } from "@/lib/navigation";

export default async function SchoolBoardsPage() {
  const profile = await requireRole(DASHBOARD_ROLES);
  if (!profile.instituteId) redirect("/unauthorized");

  const boards = await listSchoolBoards(profile.instituteId);
  return <SchoolBoardsManager boards={boards} />;
}
