import { redirect } from "next/navigation";

import {
  getCurrentProfile,
  getRoleDestination,
} from "@/lib/auth/services/auth-service";

export default async function Home() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.isActive) {
    redirect("/inactive");
  }

  redirect(getRoleDestination(profile.role));
}
