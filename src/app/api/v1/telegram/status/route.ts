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

type TelegramConnection = {
  id: string;
  status: "active" | "disabled" | "revoked";
  username: string | null;
  chat_id: string;
  connected_at: string;
  updated_at: string;
};

type TelegramConnectionAttempt = {
  id: string;
  connection_code: string;
  status: "pending" | "completed" | "expired" | "canceled";
  expires_at: string;
  created_at: string;
};

export async function GET() {
  const supabase = await createSupabaseServerClient();

  try {
    const user = await requireAuth(supabase);
    const admin = createSupabaseAdminClient();
    const botUsername = getTelegramBotUsername();

    console.info("[telegram status] bot username verified", {
      botUsername,
      expectedBotUsername: DEFAULT_TELEGRAM_BOT_USERNAME,
      isExpectedBotUsername: botUsername === DEFAULT_TELEGRAM_BOT_USERNAME,
      isConfiguredInEnv: Boolean(process.env.TELEGRAM_BOT_USERNAME?.trim()),
    });

    const { data: connection, error: connectionError } = await admin
      .from("telegram_connections")
      .select("id,status,username,chat_id,connected_at,updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connectionError) {
      return errorResponse(
        connectionError.message,
        500,
        { code: "TELEGRAM_STATUS_FAILED", details: connectionError.message },
        noStoreHeaders,
      );
    }

    const { data: attempt, error: attemptError } = await admin
      .from("telegram_connection_attempts")
      .select("id,connection_code,status,expires_at,created_at")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (attemptError) {
      return errorResponse(
        attemptError.message,
        500,
        { code: "TELEGRAM_STATUS_FAILED", details: attemptError.message },
        noStoreHeaders,
      );
    }

    const activeConnection = connection as TelegramConnection | null;
    const pendingAttempt = attempt as TelegramConnectionAttempt | null;
    const isAttemptExpired =
      pendingAttempt &&
      new Date(pendingAttempt.expires_at).getTime() <= Date.now();

    if (pendingAttempt && isAttemptExpired) {
      await admin
        .from("telegram_connection_attempts")
        .update({ status: "expired" })
        .eq("id", pendingAttempt.id);
    }

    return successResponse(
      "Telegram status loaded",
      {
        status:
          activeConnection?.status === "active"
            ? "connected"
            : pendingAttempt && !isAttemptExpired
              ? "pending"
              : "not_connected",
        connection:
          activeConnection?.status === "active"
            ? {
                id: activeConnection.id,
                username: activeConnection.username,
                connectedAt: activeConnection.connected_at,
              }
            : null,
        attempt:
          pendingAttempt && !isAttemptExpired
            ? {
                id: pendingAttempt.id,
                code: pendingAttempt.connection_code,
                botUsername,
                deepLink: getTelegramDeepLink(
                  pendingAttempt.connection_code,
                  botUsername,
                ),
                instruction: getTelegramInstruction(
                  pendingAttempt.connection_code,
                ),
                expiresAt: pendingAttempt.expires_at,
              }
            : null,
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
