import "server-only";

import { Resend } from "resend";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type WelcomeEmailInput = {
  userId: string;
  email: string;
  fullName?: string;
};

type ResendErrorLog = Record<string, unknown> & {
  message: string;
};

type WelcomeEmailFailureReason =
  | "invalid_recipient"
  | "missing_api_key"
  | "provider_error"
  | "request_failed"
  | "sender_rejected";

export type WelcomeEmailResult =
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
      reason: Exclude<WelcomeEmailFailureReason, "missing_api_key">;
      error: string;
      recipientEmail: string;
      resendError: ResendErrorLog;
      resendResponse: unknown;
      senderEmail: string;
      subject: string;
    };

export const defaultWelcomeEmailSender = "Leo Finder <onboarding@resend.dev>";
export const welcomeEmailSubject = "Welcome to Leo Finder \uD83D\uDE80";

let cachedResend: Resend | null = null;

function getResendApiKey() {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  console.info("[welcome-email] RESEND_API_KEY process.env check", {
    loaded: Boolean(apiKey),
    source: "process.env.RESEND_API_KEY",
  });

  if (!apiKey) {
    console.error("[welcome-email] RESEND_API_KEY is missing", {
      loaded: false,
      source: "process.env.RESEND_API_KEY",
    });
  }

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
  return defaultWelcomeEmailSender;
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

function getErrorMessage(error: ResendErrorLog) {
  return error.message || JSON.stringify(error);
}

function classifyResendError({
  error,
  recipientEmail,
  senderEmail,
}: {
  error: ResendErrorLog;
  recipientEmail: string;
  senderEmail: string;
}): {
  message: string;
  reason: Exclude<WelcomeEmailFailureReason, "missing_api_key">;
} {
  const message = getErrorMessage(error);
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("from") ||
    lowerMessage.includes("sender") ||
    lowerMessage.includes("domain") ||
    lowerMessage.includes("verified")
  ) {
    return {
      message: `Sender rejected by Resend (${senderEmail}). ${message}`,
      reason: "sender_rejected",
    };
  }

  if (
    lowerMessage.includes("recipient") ||
    lowerMessage.includes("invalid email") ||
    lowerMessage.includes("own email") ||
    lowerMessage.includes("testing emails") ||
    lowerMessage.includes("to")
  ) {
    return {
      message: `Recipient is invalid or rejected by Resend (${recipientEmail}). ${message}`,
      reason: "invalid_recipient",
    };
  }

  return {
    message: `Resend request failed. ${message}`,
    reason: "request_failed",
  };
}

function formatUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function formatEmailLogError(error: { message?: string } | unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return formatUnknownError(error);
}

export async function sendWelcomeEmail(
  input: WelcomeEmailInput,
): Promise<WelcomeEmailResult> {
  const resend = getResendClient();
  const recipientEmail = input.email;
  const senderEmail = getWelcomeEmailSender();
  const subject = welcomeEmailSubject;

  if (!resend) {
    const error = "RESEND_API_KEY is missing; welcome email skipped.";

    console.error("[welcome-email] Resend error", {
      error,
      recipient: recipientEmail,
      reason: "missing_api_key",
      sender: senderEmail,
      subject,
    });

    return {
      error,
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

  const resendResponse = await resend.emails
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
  const { data, error } = resendResponse;

  console.info("[welcome-email] Resend response", {
    recipient: recipientEmail,
    resendResponse,
    sender: senderEmail,
    subject,
  });

  if (error) {
    const resendError = formatResendError(error);
    const classifiedError = classifyResendError({
      error: resendError,
      recipientEmail,
      senderEmail,
    });

    console.error("[welcome-email] Resend error", {
      error: classifiedError.message,
      recipient: recipientEmail,
      resendError,
      resendErrorRaw: error,
      resendResponse,
      sender: senderEmail,
      subject,
    });

    return {
      error: classifiedError.message,
      recipientEmail,
      reason: classifiedError.reason,
      resendError,
      resendResponse,
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
    resendResponse,
    senderEmail,
    sent: true,
    status: "sent",
    subject,
  };
}

export async function saveWelcomeEmailAttemptLog({
  result,
  source = "welcome-email",
  userId = null,
}: {
  result: WelcomeEmailResult;
  source?: string;
  userId?: string | null;
}) {
  const emailLog = {
    user_id: userId,
    email_to: result.recipientEmail,
    template: "welcome",
    subject: result.subject,
    status: result.status,
    provider_message_id: result.sent ? result.id : null,
    error_message: result.sent ? null : result.error,
    sent_at: result.sent ? new Date().toISOString() : null,
  };

  console.info(`[${source}] email_logs insert started`, {
    email_to: emailLog.email_to,
    provider_message_id: emailLog.provider_message_id,
    status: emailLog.status,
    subject: emailLog.subject,
    template: emailLog.template,
    userId,
  });

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("email_logs").insert(emailLog);

    if (error) {
      console.error(`[${source}] email_logs insert failed`, {
        emailLog,
        error,
      });

      return {
        error: formatEmailLogError(error),
        saved: false,
      };
    }

    console.info(`[${source}] email_logs insert saved`, {
      emailLog,
      userId,
    });

    return {
      error: null,
      saved: true,
    };
  } catch (error) {
    console.error(`[${source}] email_logs insert failed`, {
      emailLog,
      error,
    });

    return {
      error: formatUnknownError(error),
      saved: false,
    };
  }
}
