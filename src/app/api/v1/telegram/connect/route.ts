import { errorResponse, successResponse } from "@/lib/api";
import { AuthError, requireAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_TELEGRAM_BOT_USERNAME,
  getTelegramBotUsername,
  getTelegramDeepLink,
  getTelegramInstruction,
} from "@/lib/telegram/config";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

function generateConnectionCode() {
  return `LF-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

export async function POST() {
  const supabase = await createSupabaseServerClient();

  try {
    const user = await requireAuth(supabase);
    const admin = createSupabaseAdminClient();
    const botUsername = getTelegramBotUsername();

    console.info("[telegram connect] bot username verified", {
      botUsername,
      expectedBotUsername: DEFAULT_TELEGRAM_BOT_USERNAME,
      isExpectedBotUsername: botUsername === DEFAULT_TELEGRAM_BOT_USERNAME,
      isConfiguredInEnv: Boolean(process.env.TELEGRAM_BOT_USERNAME?.trim()),
    });

    const { data: connection, error: connectionError } = await admin
      .from("telegram_connections")
      .select("id,status,username,connected_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (connectionError) {
      return errorResponse(
        connectionError.message,
        500,
        { code: "TELEGRAM_CONNECT_FAILED", details: connectionError.message },
        noStoreHeaders,
      );
    }

    if (connection) {
      return successResponse(
        "Telegram is already connected",
        {
          status: "connected",
          connection: {
            id: connection.id,
            username: connection.username,
            connectedAt: connection.connected_at,
          },
          attempt: null,
        },
        { headers: noStoreHeaders },
      );
    }

    const code = generateConnectionCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { error: cancelAttemptError } = await admin
      .from("telegram_connection_attempts")
      .update({ status: "canceled" })
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (cancelAttemptError) {
      return errorResponse(
        cancelAttemptError.message,
        500,
        {
          code: "TELEGRAM_CONNECT_FAILED",
          details: cancelAttemptError.message,
        },
        noStoreHeaders,
      );
    }

    const { data: attempt, error: attemptError } = await admin
      .from("telegram_connection_attempts")
      .insert({
        user_id: user.id,
        connection_code: code,
        status: "pending",
        expires_at: expiresAt,
      })
      .select("id,connection_code,status,expires_at,created_at")
      .single();

    if (attemptError) {
      return errorResponse(
        attemptError.message,
        500,
        { code: "TELEGRAM_CONNECT_FAILED", details: attemptError.message },
        noStoreHeaders,
      );
    }

    return successResponse(
      "Telegram connection code generated",
      {
        status: "pending",
        attempt: {
          id: attempt.id,
          code: attempt.connection_code,
          botUsername,
          deepLink: getTelegramDeepLink(attempt.connection_code, botUsername),
          instruction: getTelegramInstruction(attempt.connection_code),
          expiresAt: attempt.expires_at,
        },
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
