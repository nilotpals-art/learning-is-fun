"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { markPlannerNotificationRead } from "@/features/learning-planner/services/notification-service";
import type { PlannerActionResult } from "@/features/learning-planner/types/learning-planner";
import { requireAuth } from "@/lib/auth/services/auth-service";
export async function markPlannerNotificationReadAction(input: unknown): Promise<PlannerActionResult> { const parsed = z.object({ recipientId: z.string().uuid() }).safeParse(input); if (!parsed.success) return { status: "error", message: "Invalid notification." }; await requireAuth(); try { await markPlannerNotificationRead(parsed.data.recipientId); revalidatePath("/learning-planner/notifications"); return { status: "success", message: "Notification marked as read." }; } catch { return { status: "error", message: "We could not update this notification." }; } }
