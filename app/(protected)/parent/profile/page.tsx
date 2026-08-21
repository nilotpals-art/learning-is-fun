import { ParentProfileForm } from "@/features/parent/components/parent-profile-form";
import { requireRole } from "@/lib/auth/services/auth-service";
import { createClient } from "@/lib/supabase/server";

export default async function ParentProfilePage() {
  const profile = await requireRole(["Parent"]);
  const supabase = await createClient();
  const { data, error } = await supabase.from("parents").select("name,mobile,email").eq("profile_id", profile.id).eq("is_active", true).single();
  if (error || !data) throw error ?? new Error("PARENT_PROFILE_NOT_FOUND");
  return <ParentProfileForm name={data.name} mobile={data.mobile} email={data.email} />;
}
