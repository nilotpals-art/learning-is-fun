import { notFound, redirect } from "next/navigation";

import { ParentEnrollmentForm } from "@/features/student-enrollment/components/parent-enrollment-form";
import { loadEnrollmentInvite } from "@/features/student-enrollment/services/enrollment-service";
import styles from "./enrollment-theme.module.css";

export default async function ParentEnrollmentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await loadEnrollmentInvite(token);
  if (!invite) notFound();
  if (invite.status === "SUBMITTED") redirect(`/enroll/${token}/success`);
  if (invite.status !== "ACTIVE" || new Date(invite.expiresAt) <= new Date()) {
    return <main className="mx-auto max-w-xl px-4 py-16 text-center"><h1 className="text-2xl font-bold">Enrollment link unavailable</h1><p className="mt-3 text-muted-foreground">This enrollment link has expired or is no longer active. Please contact Learning Is Fun for a new link.</p></main>;
  }
  return <div className={styles.theme}><ParentEnrollmentForm invite={invite} /></div>;
}
