import { NextResponse } from "next/server";

import { runFeeReminderWorker } from "@/features/fees/services/fee-worker-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runFeeReminderWorker();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Fee reminder worker failed", error);
    return NextResponse.json({ ok: false, error: "fee_worker_failed" }, { status: 500 });
  }
}
