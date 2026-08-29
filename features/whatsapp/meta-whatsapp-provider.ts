import "server-only";

import type {
  SendWhatsAppTemplateInput,
  WhatsAppProvider,
  WhatsAppSendResult,
} from "@/features/whatsapp/types";

const DEFAULT_GRAPH_API_VERSION = "v25.0";

interface MetaMessageResponse {
  messages?: Array<{ id?: string }>;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

function getConfig() {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "",
    graphApiVersion:
      process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_API_VERSION,
  };
}

function normalizeRecipientPhone(value: string): string {
  let normalized = value.replace(/[^0-9]/g, "");
  if (normalized.length === 10) normalized = `91${normalized}`;

  if (normalized.length < 8 || normalized.length > 15) {
    throw new Error("Invalid WhatsApp recipient phone number.");
  }

  return normalized;
}

function sanitizeMetaError(payload: MetaMessageResponse): string {
  const code = payload.error?.code;
  const subcode = payload.error?.error_subcode;
  const message = payload.error?.message;

  return [
    "Meta WhatsApp request failed",
    code ? `code ${code}` : null,
    subcode ? `subcode ${subcode}` : null,
    message ? `(${message})` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

export class MetaWhatsAppProvider implements WhatsAppProvider {
  isConfigured(): boolean {
    const config = getConfig();
    return Boolean(config.accessToken && config.phoneNumberId);
  }

  async sendTemplate(
    input: SendWhatsAppTemplateInput,
  ): Promise<WhatsAppSendResult> {
    const config = getConfig();

    if (!config.accessToken || !config.phoneNumberId) {
      throw new Error("WhatsApp is not configured.");
    }

    const recipient = normalizeRecipientPhone(input.to);
    const url = `https://graph.facebook.com/${encodeURIComponent(
      config.graphApiVersion,
    )}/${encodeURIComponent(config.phoneNumberId)}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "template",
        template: {
          name: input.templateName,
          language: { code: input.languageCode ?? "en_US" },
          ...(input.components && input.components.length > 0
            ? { components: input.components }
            : {}),
        },
      }),
      cache: "no-store",
    });

    const payload = (await response.json()) as MetaMessageResponse;

    if (!response.ok) {
      throw new Error(sanitizeMetaError(payload));
    }

    const messageId = payload.messages?.[0]?.id;
    if (!messageId) {
      throw new Error("Meta WhatsApp returned no message id.");
    }

    return {
      provider: "meta",
      messageId,
    };
  }
}

export const metaWhatsAppProvider = new MetaWhatsAppProvider();
