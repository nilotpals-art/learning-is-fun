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

type SignatureCheckResult =
  | { ok: true }
  | { ok: false; reason: "app-secret-missing" | "signature-missing" | "signature-format" | "signature-mismatch" };

function verifySignature(rawBody: Buffer, signatureHeader: string | null): SignatureCheckResult {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!appSecret) return { ok: false, reason: "app-secret-missing" };
  if (!signatureHeader) return { ok: false, reason: "signature-missing" };

  const match = /^sha256=([a-f0-9]{64})$/i.exec(signatureHeader.trim());
  if (!match) return { ok: false, reason: "signature-format" };

  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  const received = Buffer.from(match[1], "hex");

  if (received.length !== expected.length || !timingSafeEqual(expected, received)) {
    return { ok: false, reason: "signature-mismatch" };
  }

  return { ok: true };
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
  const rawBody = Buffer.from(await request.arrayBuffer());
  const signatureCheck = verifySignature(rawBody, request.headers.get("x-hub-signature-256"));

  if (!signatureCheck.ok) {
    console.warn("WhatsApp webhook signature rejected", {
      reason: signatureCheck.reason,
      hasSignatureHeader: request.headers.has("x-hub-signature-256"),
      hasConfiguredAppSecret: Boolean(process.env.WHATSAPP_APP_SECRET?.trim()),
      bodyBytes: rawBody.length,
    });
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString("utf8")) as MetaWebhookPayload;
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
