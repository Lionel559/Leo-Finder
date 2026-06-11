import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getWelcomeEmailSender,
  saveWelcomeEmailAttemptLog,
  sendWelcomeEmail,
  type WelcomeEmailResult,
  welcomeEmailSubject,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

const testEmailSchema = z
  .object({
    email: z.string().trim().email().toLowerCase(),
  })
  .strict();

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function formatUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = testEmailSchema.safeParse(body);
  const rawEmail =
    body && typeof body === "object" && "email" in body
      ? String(body.email)
      : null;

  if (!parsed.success) {
    const error =
      rawEmail && rawEmail.trim()
        ? `Recipient is invalid (${rawEmail}). Provide a valid email address.`
        : "Recipient is invalid. Provide a valid email address.";

    console.error("[email test] recipient invalid", {
      error,
      recipient: rawEmail,
      subject: welcomeEmailSubject,
    });

    return NextResponse.json(
      {
        error,
        resendResponse: null,
        success: false,
      },
      {
        headers: noStoreHeaders,
        status: 422,
      },
    );
  }

  const email = parsed.data.email;
  const sender = getWelcomeEmailSender();

  console.info("[email test] welcome email started", {
    recipient: email,
    sender,
    subject: welcomeEmailSubject,
  });

  const result = await sendWelcomeEmail({
    email,
    fullName: "there",
    userId: "email-test",
  }).catch((error: unknown): WelcomeEmailResult => ({
    error: `Resend request failed. ${formatUnknownError(error)}`,
    recipientEmail: email,
    reason: "request_failed",
    resendError: {
      message: formatUnknownError(error),
    },
    resendResponse: null,
    senderEmail: sender,
    sent: false,
    status: "failed",
    subject: welcomeEmailSubject,
  }));

  const emailLog = await saveWelcomeEmailAttemptLog({
    result,
    source: "email-test",
    userId: null,
  });

  return NextResponse.json(
    {
      emailLog,
      error: result.sent ? null : result.error,
      resendResponse: result.resendResponse,
      success: result.sent,
    },
    {
      headers: noStoreHeaders,
      status: 200,
    },
  );
}
