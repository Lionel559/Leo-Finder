import { Resend } from "resend";
import { z } from "zod";

import { errorResponse, successResponse, validationErrorResponse } from "@/lib/api";
import { AuthError, requireAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const adminEmail = "ayooladeji8@gmail.com";
const contactSender = "Leo Finder <onboarding@resend.dev>";
const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

const contactSchema = z
  .object({
    subject: z.string().trim().min(1).max(160),
    message: z.string().trim().min(10).max(5000),
  })
  .strict();

type ContactMessage = {
  id: string;
  created_at: string;
};

function formatUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
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

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function sendContactEmail({
  email,
  message,
  messageId,
  subject,
  userId,
}: {
  email: string;
  message: string;
  messageId: string;
  subject: string;
  userId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    const error = "RESEND_API_KEY is missing; contact email skipped.";
    console.warn("[contact] Resend skipped", {
      error,
      messageId,
      recipient: adminEmail,
      sender: contactSender,
      userEmail: email,
      userId,
    });

    return {
      attempted: false,
      error,
      response: null,
      sent: false,
    };
  }

  const resend = new Resend(apiKey);
  const emailSubject = `Leo Finder support: ${subject}`;
  const escapedEmail = escapeHtml(email);
  const escapedMessage = escapeHtml(message);
  const escapedMessageId = escapeHtml(messageId);
  const escapedSubject = escapeHtml(subject);
  const escapedUserId = escapeHtml(userId);

  try {
    const response = await resend.emails.send({
      from: contactSender,
      to: adminEmail,
      subject: emailSubject,
      text: [
        "New Leo Finder contact message",
        "",
        `From: ${email}`,
        `User ID: ${userId}`,
        `Message ID: ${messageId}`,
        "",
        "Subject:",
        subject,
        "",
        "Message:",
        message,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h1 style="font-size: 20px; margin: 0 0 16px;">New Leo Finder contact message</h1>
          <p style="margin: 0 0 8px;"><strong>From:</strong> ${escapedEmail}</p>
          <p style="margin: 0 0 8px;"><strong>User ID:</strong> ${escapedUserId}</p>
          <p style="margin: 0 0 16px;"><strong>Message ID:</strong> ${escapedMessageId}</p>
          <p style="margin: 0 0 8px;"><strong>Subject:</strong> ${escapedSubject}</p>
          <p style="white-space: pre-wrap; margin: 0;">${escapedMessage}</p>
        </div>
      `,
    });

    console.info("[contact] Resend response", {
      messageId,
      recipient: adminEmail,
      response,
      sender: contactSender,
      userEmail: email,
      userId,
    });

    if (response.error) {
      const error =
        response.error.message || "Resend contact email request failed.";
      console.error("[contact] Resend error", {
        error,
        messageId,
        recipient: adminEmail,
        response,
        sender: contactSender,
        userEmail: email,
        userId,
      });

      return {
        attempted: true,
        error,
        response,
        sent: false,
      };
    }

    return {
      attempted: true,
      error: null,
      response,
      sent: true,
    };
  } catch (error) {
    const messageText = formatUnknownError(error);
    console.error("[contact] Resend request failed", {
      error,
      message: messageText,
      messageId,
      recipient: adminEmail,
      sender: contactSender,
      userEmail: email,
      userId,
    });

    return {
      attempted: true,
      error: messageText,
      response: null,
      sent: false,
    };
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const user = await requireAuth(supabase);
    const body = await readJson(request);
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.flatten().fieldErrors,
        "Invalid contact message",
        noStoreHeaders,
      );
    }

    const email = user.email;

    if (!email) {
      return errorResponse(
        "Your account email could not be found.",
        400,
        { code: "CONTACT_EMAIL_MISSING" },
        noStoreHeaders,
      );
    }

    const admin = createSupabaseAdminClient();
    const { data, error: saveError } = await admin
      .from("contact_messages")
      .insert({
        email,
        message: parsed.data.message,
        subject: parsed.data.subject,
        user_id: user.id,
      })
      .select("id,created_at")
      .single();

    if (saveError) {
      return errorResponse(
        "Your message could not be saved.",
        500,
        { code: "CONTACT_SAVE_FAILED", details: saveError.message },
        noStoreHeaders,
      );
    }

    const contactMessage = data as ContactMessage;
    const emailDelivery = await sendContactEmail({
      email,
      message: parsed.data.message,
      messageId: contactMessage.id,
      subject: parsed.data.subject,
      userId: user.id,
    });

    return successResponse(
      "Your message has been sent. We will reply soon.",
      {
        createdAt: contactMessage.created_at,
        emailAttempted: emailDelivery.attempted,
        emailError: emailDelivery.error,
        emailSent: emailDelivery.sent,
        messageId: contactMessage.id,
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return errorResponse(
        error.message,
        error.status,
        { code: error.code },
        noStoreHeaders,
      );
    }

    throw error;
  }
}
