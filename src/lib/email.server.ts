/**
 * Email delivery — Cloutbase does NOT ship its own mail sender.
 * Emails are handed to whatever external email service the admin configures
 * on /admin/email ("Email Service API"). Until that is configured, every email
 * is written to the email log as "queued" and nothing is faked or sent.
 */

export type EmailConfig = {
  enabled: boolean;
  provider_name: string | null;
  endpoint: string | null;
  from_email: string | null;
  from_name: string;
  api_key_secret_name: string;
};

export type DeliveryResult =
  | { sent: true }
  | { sent: false; reason: string; error?: string };

export async function deliverEmail(
  config: EmailConfig,
  message: { to: string; subject: string; body: string },
): Promise<DeliveryResult> {
  if (!config.enabled) {
    return { sent: false, reason: "Email service is switched off in admin settings." };
  }
  if (!config.endpoint || !config.from_email) {
    return {
      sent: false,
      reason: "Email Service API is not configured yet (endpoint + from address required).",
    };
  }

  const apiKey = process.env[config.api_key_secret_name];
  if (!apiKey) {
    return {
      sent: false,
      reason: `Missing secret ${config.api_key_secret_name} for the configured email provider.`,
    };
  }

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `${config.from_name} <${config.from_email}>`,
        to: [message.to],
        subject: message.subject,
        text: message.body,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(`Email provider failed [${response.status}]: ${detail}`);
      return { sent: false, reason: `Provider returned ${response.status}`, error: detail.slice(0, 500) };
    }
    return { sent: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Email provider request failed:", detail);
    return { sent: false, reason: "Provider request failed", error: detail.slice(0, 500) };
  }
}
