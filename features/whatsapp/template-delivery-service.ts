import "server-only";

import { metaWhatsAppProvider } from "@/features/whatsapp/meta-whatsapp-provider";
import {
  WHATSAPP_TEMPLATE_LANGUAGE,
  WHATSAPP_TEMPLATES,
  type WhatsAppTemplateKey,
} from "@/features/whatsapp/templates";

export type ApprovedWhatsAppDeliveryResult =
  | { status: "sent"; messageId: string }
  | { status: "not_configured" }
  | { status: "failed"; error: string };

function text(value: unknown): string {
  if (value == null || value === "") return "-";
  return String(value);
}

export async function sendApprovedWhatsAppTemplate(
  to: string,
  templateKey: WhatsAppTemplateKey,
  parameters: readonly unknown[],
): Promise<ApprovedWhatsAppDeliveryResult> {
  const template = WHATSAPP_TEMPLATES[templateKey];
  if (parameters.length !== template.parameters.length) {
    return { status: "failed", error: "WHATSAPP_TEMPLATE_PARAMETER_MISMATCH" };
  }
  if (!metaWhatsAppProvider.isConfigured()) return { status: "not_configured" };

  try {
    const result = await metaWhatsAppProvider.sendTemplate({
      to,
      templateName: template.name,
      languageCode: WHATSAPP_TEMPLATE_LANGUAGE,
      components: [
        {
          type: "body",
          parameters: parameters.map((value) => ({ type: "text", text: text(value) })),
        },
      ],
    });
    return { status: "sent", messageId: result.messageId };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "WhatsApp delivery failed.",
    };
  }
}
