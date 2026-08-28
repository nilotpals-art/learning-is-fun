import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import type {
  WhatsAppDeliveryStatus,
  WhatsAppWebhookStatus,
} from "@/features/whatsapp/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED_STATUSES = new Set<WhatsAppDeliveryStatus>([
  "sent",
  "delivered",
  "read",
  "failed",
  "deleted",
]);

interface MetaWebhookError {
  code?: number;
  title?: string;
}

interface MetaWebhookStatusValue {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: MetaWebhookError[];
}

interface MetaWebhookValue {
  statuses?: MetaWebhookStatusValue[];
}

interface MetaWebhookChange {
  field?: string;
  value?: MetaWebhookValue;
}

interface MetaWebhookEntry {
  changes?: MetaWebhookChange[];
}

interface MetaWebhookPayload {
  object?: string;
  entry?: MetaWebhookEntry[];
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!appSecret || !signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

function extractStatuses(payload: MetaWebhookPayload): WhatsAppWebhookStatus[] {
  const statuses: WhatsAppWebhookStatus[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;

      for (const value of change.value?.statuses ?? []) {
        if (!value.id || !value.status) continue;
        if (!SUPPORTED_STATUSES.has(value.status as WhatsAppDeliveryStatus)) continue;

        const error = value.errors?.[0];
        statuses.push({
          messageId: value.id,
          status: value.status as WhatsAppDeliveryStatus,
          recipientId: value.recipient_id,
          timestamp: value.timestamp,
          errorCode: error?.code ? String(error.code) : undefined,
          errorTitle: error?.title,
        });
      }
    }
  }

  return statuses;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();

  if (
    mode === "subscribe" &&
    challenge &&
    expectedToken &&
    token === expectedToken
  ) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Webhook verification failed." }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as MetaWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (payload.object !== "whatsapp_business_account") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const statuses = extractStatuses(payload);

  // Delivery events are deliberately sanitized. Do not log access tokens,
  // message bodies, or full provider payloads. Persistence can be wired to
  // the existing ERP outbox once a provider-message-id column is confirmed.
  if (statuses.length > 0) {
    console.info("WhatsApp delivery status update", statuses);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
