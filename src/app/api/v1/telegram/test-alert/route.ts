import { errorResponse, successResponse } from "@/lib/api";
import { AuthError, requireAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram/messages";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

const testAlertMessage =
  "\uD83D\uDE80 Leo Finder Test Alert\n\nYour Telegram account is connected successfully.\nYou will receive opportunity alerts here.";

type TelegramConnection = {
  id: string;
  telegram_user_id: string | null;
  telegram_username: string | null;
  chat_id: string;
  username: string | null;
  connected_at: string;
};

export async function POST() {
  const supabase = await createSupabaseServerClient();

  try {
    const user = await requireAuth(supabase);
    const admin = createSupabaseAdminClient();

    const { data: connection, error: connectionError } = await admin
      .from("telegram_connections")
      .select(
        "id,telegram_user_id,telegram_username,chat_id,username,connected_at",
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (connectionError) {
      return errorResponse(
        connectionError.message,
        500,
        {
          code: "TELEGRAM_TEST_ALERT_FAILED",
          details: connectionError.message,
        },
        noStoreHeaders,
      );
    }

    const activeConnection = connection as TelegramConnection | null;

    if (!activeConnection) {
      return errorResponse(
        "Telegram is not connected.",
        409,
        { code: "TELEGRAM_NOT_CONNECTED" },
        noStoreHeaders,
      );
    }

    const delivery = await sendTelegramMessage(
      activeConnection.chat_id,
      testAlertMessage,
    );

    if (!delivery.sent) {
      return errorResponse(
        delivery.error ?? "Telegram test alert could not be sent.",
        502,
        {
          code: "TELEGRAM_TEST_ALERT_FAILED",
          details: delivery.response ?? delivery.error,
        },
        noStoreHeaders,
      );
    }

    console.info("[telegram test alert] sent", {
      connectionId: activeConnection.id,
      telegramUserId: activeConnection.telegram_user_id,
      userId: user.id,
    });

    return successResponse(
      "Telegram test alert sent",
      {
        sent: true,
        connection: {
          id: activeConnection.id,
          telegramUserId: activeConnection.telegram_user_id,
          telegramUsername:
            activeConnection.telegram_username ?? activeConnection.username,
          username: activeConnection.username,
          connectedAt: activeConnection.connected_at,
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
