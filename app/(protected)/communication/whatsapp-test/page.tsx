import { redirect } from "next/navigation";

import { metaWhatsAppProvider } from "@/features/whatsapp/meta-whatsapp-provider";
import { ADMINISTRATOR_ROLES } from "@/lib/auth/roles";
import { requireActionRole, requireRole } from "@/lib/auth/services/auth-service";

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function safeMessage(value: unknown): string {
  if (value instanceof Error) return value.message.slice(0, 300);
  return "WhatsApp test failed.";
}

async function sendWhatsAppTest(formData: FormData) {
  "use server";

  await requireActionRole(ADMINISTRATOR_ROLES);

  const to = String(formData.get("to") ?? "").trim();
  const templateName = String(formData.get("templateName") ?? "").trim();
  const languageCode = String(formData.get("languageCode") ?? "en_US").trim() || "en_US";

  if (!to || !templateName) {
    redirect("/communication/whatsapp-test?error=Recipient%20and%20template%20name%20are%20required.");
  }

  if (!metaWhatsAppProvider.isConfigured()) {
    redirect("/communication/whatsapp-test?error=WhatsApp%20is%20not%20configured%20on%20the%20server.");
  }

  let messageId: string;

  try {
    const result = await metaWhatsAppProvider.sendTemplate({
      to,
      templateName,
      languageCode,
    });
    messageId = result.messageId;
  } catch (error) {
    const message = encodeURIComponent(safeMessage(error));
    redirect(`/communication/whatsapp-test?error=${message}`);
  }

  redirect(`/communication/whatsapp-test?sent=1&messageId=${encodeURIComponent(messageId)}`);
}

export default async function WhatsAppTestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(ADMINISTRATOR_ROLES);

  const params = await searchParams;
  const sent = firstValue(params.sent) === "1";
  const messageId = firstValue(params.messageId);
  const error = firstValue(params.error);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">WhatsApp Production Test</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Send one approved Meta WhatsApp template using the production Cloud API configuration stored in Vercel.
        </p>
      </div>

      {sent ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-medium">Message accepted by Meta.</p>
          {messageId ? <p className="mt-1 break-all">Message ID: {messageId}</p> : null}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-medium">Message was not sent.</p>
          <p className="mt-1 break-words">{error}</p>
        </div>
      ) : null}

      <form action={sendWhatsAppTest} className="space-y-5 rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <label htmlFor="to" className="text-sm font-medium">
            Recipient number
          </label>
          <input
            id="to"
            name="to"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="919876543210"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">Use country code and number only. Spaces and + are accepted.</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="templateName" className="text-sm font-medium">
            Approved template name
          </label>
          <input
            id="templateName"
            name="templateName"
            required
            placeholder="exam_schedule_notice"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            This must be an approved template on your production WhatsApp Business Account. Meta test-number templates may not be available here.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="languageCode" className="text-sm font-medium">
            Language code
          </label>
          <input
            id="languageCode"
            name="languageCode"
            defaultValue="en_US"
            required
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Send production test
        </button>
      </form>

      <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        Only administrators can open this page or run the send action. Access tokens and app secrets remain server-side and are never shown in the browser.
      </div>
    </div>
  );
}
