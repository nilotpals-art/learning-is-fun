import "server-only";

export interface WhatsAppDeliveryResult {
  status: "sent" | "not_configured" | "failed";
  providerMessageId?: string;
  errorCode?: string;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function sendWhatsAppTemplate(): Promise<WhatsAppDeliveryResult> {
  // Live Meta delivery is deliberately inactive until credentials and approved
  // templates are configured. The outbox remains the source of delivery work.
  if (!isWhatsAppConfigured()) return { status: "not_configured", errorCode: "PROVIDER_NOT_CONFIGURED" };
  return { status: "failed", errorCode: "PROVIDER_DISPATCH_NOT_ENABLED" };
}
