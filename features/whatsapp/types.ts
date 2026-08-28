export interface WhatsAppTemplateParameter {
  type: "text";
  text: string;
}

export interface WhatsAppTemplateComponent {
  type: "body" | "header" | "button";
  parameters: WhatsAppTemplateParameter[];
}

export interface SendWhatsAppTemplateInput {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: WhatsAppTemplateComponent[];
}

export interface WhatsAppSendResult {
  provider: "meta";
  messageId: string;
}

export interface WhatsAppProvider {
  isConfigured(): boolean;
  sendTemplate(input: SendWhatsAppTemplateInput): Promise<WhatsAppSendResult>;
}

export type WhatsAppDeliveryStatus =
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "deleted";

export interface WhatsAppWebhookStatus {
  messageId: string;
  status: WhatsAppDeliveryStatus;
  recipientId?: string;
  timestamp?: string;
  errorCode?: string;
  errorTitle?: string;
}
