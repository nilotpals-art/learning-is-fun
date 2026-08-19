import "server-only";

export interface WhatsAppDeliveryResult {
  status: "sent" | "not_configured" | "failed";
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface WhatsAppTemplateInput {
  to: string;
  templateName: string;
  parameters: Array<string | number | null | undefined>;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

function phone(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

export async function sendWhatsAppTemplate(input: WhatsAppTemplateInput): Promise<WhatsAppDeliveryResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) return { status: "not_configured", errorCode: "PROVIDER_NOT_CONFIGURED" };

  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || "v23.0";
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en";
  try {
    const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone(input.to),
        type: "template",
        template: {
          name: input.templateName,
          language: { code: languageCode },
          components: [{ type: "body", parameters: input.parameters.map((value) => ({ type: "text", text: value == null || value === "" ? "-" : String(value) })) }],
        },
      }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({})) as { messages?: Array<{ id?: string }>; error?: { code?: number; message?: string; error_subcode?: number } };
    if (!response.ok) return { status: "failed", errorCode: String(data.error?.error_subcode ?? data.error?.code ?? response.status), errorMessage: data.error?.message ?? "WhatsApp provider rejected the message." };
    return { status: "sent", providerMessageId: data.messages?.[0]?.id };
  } catch (error) {
    return { status: "failed", errorCode: "PROVIDER_REQUEST_FAILED", errorMessage: error instanceof Error ? error.message : "WhatsApp provider request failed." };
  }
}
