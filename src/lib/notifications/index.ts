import "server-only";

import { Resend } from "resend";

type WelcomeEmailInput = {
  userId: string;
  email: string;
  fullName?: string;
};

type ResendErrorLog = Record<string, unknown> & {
  message: string;
};

type WelcomeEmailResult =
  | {
      sent: true;
      status: "sent";
      id: string | null;
      recipientEmail: string;
      resendError: null;
      resendResponse: unknown;
      senderEmail: string;
      subject: string;
    }
  | {
      sent: false;
      status: "skipped";
      reason: "missing_api_key";
      error: string;
      recipientEmail: string;
      resendError: null;
      resendResponse: null;
      senderEmail: string;
      subject: string;
    }
  | {
      sent: false;
      status: "failed";
      reason: "provider_error";
      error: string;
      recipientEmail: string;
      resendError: ResendErrorLog;
      resendResponse: unknown;
      senderEmail: string;
      subject: string;
    };

export const defaultWelcomeEmailSender = "Leo Finder <onboarding@resend.dev>";
export const welcomeEmailSubject = "Welcome to Leo Finder 🚀";

let cachedResend: Resend | null = null;

function getResendApiKey() {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  console.info("[welcome-email] RESEND_API_KEY process.env check", {
    loaded: Boolean(apiKey),
    source: "process.env.RESEND_API_KEY",
  });

  return apiKey;
}

function getResendClient() {
  const apiKey = getResendApiKey();

  if (!apiKey) {
    return null;
  }

  cachedResend ??= new Resend(apiKey);

  return cachedResend;
}

export function getWelcomeEmailSender() {
  if (process.env.NODE_ENV !== "production") {
    return defaultWelcomeEmailSender;
  }

  return process.env.RESEND_FROM_EMAIL?.trim() || defaultWelcomeEmailSender;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

function formatResendError(error: unknown): ResendErrorLog {
  if (error instanceof Error) {
    return {
      cause: error.cause,
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message =
      typeof record.message === "string"
        ? record.message
        : JSON.stringify(record);

    return {
      ...record,
      message,
    };
  }

  return {
    message: String(error),
  };
}

export async function sendWelcomeEmail(
  input: WelcomeEmailInput,
): Promise<WelcomeEmailResult> {
  const resend = getResendClient();
  const recipientEmail = input.email;
  const senderEmail = getWelcomeEmailSender();
  const subject = welcomeEmailSubject;

  if (!resend) {
    console.info("[welcome-email] Resend send skipped", {
      recipientEmail,
      reason: "missing_api_key",
      senderEmail,
      subject,
    });

    return {
      error: "RESEND_API_KEY is missing; welcome email skipped.",
      recipientEmail,
      reason: "missing_api_key",
      resendError: null,
      resendResponse: null,
      senderEmail,
      sent: false,
      status: "skipped",
      subject,
    };
  }

  const firstName = input.fullName?.split(" ").filter(Boolean)[0] ?? "there";
  const escapedFirstName = escapeHtml(firstName);

  const { data, error } = await resend.emails
    .send({
      from: senderEmail,
      to: recipientEmail,
      subject,
      text: [
        `Welcome to Leo Finder, ${firstName}!`,
        "",
        "You are now set up to use Leo Finder as your AI Opportunity Agent.",
        "",
        "Good first steps:",
        "- Upload your resume",
        "- Add your skills",
        "- Connect Telegram",
        "- Start discovering opportunities",
        "",
        "We are glad you are here.",
        "The Leo Finder team",
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h1 style="font-size: 24px; margin: 0 0 16px;">Welcome to Leo Finder, ${escapedFirstName}.</h1>
          <p style="margin: 0 0 16px;">You are now set up to use Leo Finder as your AI Opportunity Agent.</p>
          <p style="margin: 0 0 8px;">Good first steps:</p>
          <ul style="margin: 0 0 16px; padding-left: 20px;">
            <li>Upload your resume</li>
            <li>Add your skills</li>
            <li>Connect Telegram</li>
            <li>Start discovering opportunities</li>
          </ul>
          <p style="margin: 0;">We are glad you are here.</p>
          <p style="margin: 16px 0 0;">The Leo Finder team</p>
        </div>
      `,
    })
    .catch((caughtError: unknown) => ({
      data: null,
      error: formatResendError(caughtError),
    }));

  console.info("[welcome-email] Resend response", {
    recipientEmail,
    resendResponse: data,
    senderEmail,
    subject,
  });

  if (error) {
    const resendError = formatResendError(error);

    console.error("[welcome-email] Resend error", {
      recipientEmail,
      resendError,
      resendErrorRaw: error,
      senderEmail,
      subject,
    });

    return {
      error: resendError.message,
      recipientEmail,
      reason: "provider_error",
      resendError,
      resendResponse: data,
      senderEmail,
      sent: false,
      status: "failed",
      subject,
    };
  }

  return {
    id: data?.id ?? null,
    recipientEmail,
    resendError: null,
    resendResponse: data,
    senderEmail,
    sent: true,
    status: "sent",
    subject,
  };
}
