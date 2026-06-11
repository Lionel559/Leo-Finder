import { errorResponse, successResponse } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTelegramBotToken } from "@/lib/telegram/config";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

const connectionSuccessMessage =
  "\u2705 Leo Finder connected successfully.";
const startWelcomeMessage =
  "Welcome to Leo Finder. Please connect your account from the web app first.";
const invalidCodeMessage =
  "That Leo Finder connection code was not found or has already been used. Please connect your account from the web app first.";
const expiredCodeMessage =
  "That Leo Finder connection code has expired. Please connect your account from the web app first.";

type TelegramWebhookUpdate = {
  update_id?: number;
  message?: {
    message_id?: number;
    text?: string;
    from?: {
      id?: number | string;
      username?: string;
    };
    chat?: {
      id?: number | string;
    };
  };
};

type TelegramConnectionAttempt = {
  id: string;
  user_id: string;
  connection_code: string;
  status: string;
  expires_at: string;
};

function getWebhookSecret(source: NodeJS.ProcessEnv = process.env) {
  return source.TELEGRAM_WEBHOOK_SECRET?.trim() || null;
}

function parseTelegramText(text: string | undefined) {
  const trimmed = text?.trim();

  if (!trimmed) {
    return {
      connectionCode: null,
      isStartCommand: false,
    };
  }

  const parts = trimmed.split(/\s+/);
  const command = parts[0]?.toLowerCase();
  const isStartCommand = command === "/start" || command?.startsWith("/start@");

  if (isStartCommand) {
    return {
      connectionCode: parts[1]?.trim().toUpperCase() || null,
      isStartCommand: true,
    };
  }

  return {
    connectionCode: null,
    isStartCommand: false,
  };
}

async function sendTelegramMessage(
  chatId: string,
  text: string,
  token = getTelegramBotToken(),
) {
  if (!token) {
    const error = "TELEGRAM_BOT_TOKEN is missing.";
    console.error("[telegram webhook] sendMessage failed", {
      chatId,
      error,
    });
    return {
      error,
      response: null,
      sent: false,
    };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      },
    );
    const responseBody = await response.json().catch(() => null);

    if (!response.ok || responseBody?.ok === false) {
      const error =
        responseBody?.description ??
        `Telegram sendMessage failed with status ${response.status}.`;
      console.error("[telegram webhook] sendMessage failed", {
        chatId,
        error,
        response: responseBody,
      });

      return {
        error,
        response: responseBody,
        sent: false,
      };
    }

    console.info("[telegram webhook] sendMessage sent", {
      chatId,
      response: responseBody,
    });

    return {
      error: null,
      response: responseBody,
      sent: true,
    };
  } catch (caughtError) {
    const error =
      caughtError instanceof Error
        ? caughtError.message
        : "Telegram sendMessage failed.";
    console.error("[telegram webhook] sendMessage failed", {
      chatId,
      error,
    });

    return {
      error,
      response: null,
      sent: false,
    };
  }
}

async function readJson(request: Request): Promise<TelegramWebhookUpdate | null> {
  try {
    return (await request.json()) as TelegramWebhookUpdate;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  // Telegram webhooks require a public HTTPS URL. Bot updates will not reach
  // localhost unless the local server is exposed with ngrok or deployed to a
  // public Vercel URL and configured with setWebhook.
  const webhookSecret = getWebhookSecret();
  const requestWebhookSecret = request.headers.get(
    "x-telegram-bot-api-secret-token",
  );

  if (webhookSecret && requestWebhookSecret !== webhookSecret) {
    console.warn("[telegram webhook] rejected invalid webhook secret");

    return errorResponse(
      "Telegram webhook secret is invalid.",
      401,
      { code: "TELEGRAM_WEBHOOK_SECRET_INVALID" },
      noStoreHeaders,
    );
  }

  const update = await readJson(request);
  const message = update?.message;
  const telegramUserId = message?.from?.id?.toString();
  const telegramUsername = message?.from?.username ?? null;
  const chatId = message?.chat?.id?.toString();
  const token = getTelegramBotToken();
  const { connectionCode, isStartCommand } = parseTelegramText(message?.text);

  console.info("[telegram webhook] update received", {
    chatId,
    hasConnectionCode: Boolean(connectionCode),
    hasMessage: Boolean(message),
    hasTelegramBotToken: Boolean(token),
    hasWebhookSecret: Boolean(webhookSecret),
    isStartCommand,
    messageId: message?.message_id,
    telegramUserId,
    telegramUsername,
    updateId: update?.update_id,
  });

  if (!token) {
    return errorResponse(
      "TELEGRAM_BOT_TOKEN is not configured.",
      500,
      { code: "TELEGRAM_BOT_TOKEN_MISSING" },
      noStoreHeaders,
    );
  }

  if (chatId && isStartCommand && !connectionCode) {
    const confirmation = await sendTelegramMessage(
      chatId,
      startWelcomeMessage,
      token,
    );

    return successResponse(
      "Telegram start handled",
      {
        connected: false,
        confirmation,
        reason: "missing_connection_code",
      },
      { headers: noStoreHeaders },
    );
  }

  if (!telegramUserId || !chatId || !connectionCode) {
    return successResponse(
      "Telegram webhook ignored",
      {
        connected: false,
        reason: "missing_message_user_chat_or_code",
      },
      { headers: noStoreHeaders },
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: attempt, error: attemptError } = await admin
    .from("telegram_connection_attempts")
    .select("id,user_id,connection_code,status,expires_at")
    .eq("connection_code", connectionCode)
    .eq("status", "pending")
    .maybeSingle();

  if (attemptError) {
    console.error("[telegram webhook] attempt lookup failed", {
      connectionCode,
      error: attemptError,
    });
    return errorResponse(
      attemptError.message,
      500,
      { code: "TELEGRAM_ATTEMPT_LOOKUP_FAILED", details: attemptError.message },
      noStoreHeaders,
    );
  }

  const pendingAttempt = attempt as TelegramConnectionAttempt | null;

  if (!pendingAttempt) {
    await sendTelegramMessage(chatId, invalidCodeMessage, token);

    return successResponse(
      "Telegram connection code not found",
      {
        connected: false,
        reason: "invalid_or_used_code",
      },
      { headers: noStoreHeaders },
    );
  }

  if (new Date(pendingAttempt.expires_at).getTime() <= Date.now()) {
    await admin
      .from("telegram_connection_attempts")
      .update({ status: "expired" })
      .eq("id", pendingAttempt.id);

    await sendTelegramMessage(chatId, expiredCodeMessage, token);

    return successResponse(
      "Telegram connection code expired",
      {
        connected: false,
        reason: "expired_code",
      },
      { headers: noStoreHeaders },
    );
  }

  const connectedAt = new Date().toISOString();
  const { data: connection, error: connectionError } = await admin
    .from("telegram_connections")
    .upsert(
      {
        user_id: pendingAttempt.user_id,
        telegram_user_id: telegramUserId,
        chat_id: chatId,
        username: telegramUsername,
        status: "active",
        connected_at: connectedAt,
      },
      { onConflict: "user_id" },
    )
    .select("id,user_id,telegram_user_id,chat_id,username,status,connected_at")
    .single();

  if (connectionError) {
    console.error("[telegram webhook] connection save failed", {
      connectionCode,
      error: connectionError,
      telegramUserId,
      telegramUsername,
    });
    return errorResponse(
      connectionError.message,
      500,
      { code: "TELEGRAM_CONNECTION_SAVE_FAILED", details: connectionError.message },
      noStoreHeaders,
    );
  }

  const { error: attemptUpdateError } = await admin
    .from("telegram_connection_attempts")
    .update({
      status: "completed",
      used_at: connectedAt,
    })
    .eq("id", pendingAttempt.id);

  if (attemptUpdateError) {
    console.error("[telegram webhook] attempt completion failed", {
      attemptId: pendingAttempt.id,
      error: attemptUpdateError,
    });
    return errorResponse(
      attemptUpdateError.message,
      500,
      {
        code: "TELEGRAM_ATTEMPT_COMPLETE_FAILED",
        details: attemptUpdateError.message,
      },
      noStoreHeaders,
    );
  }

  const confirmation = await sendTelegramMessage(
    chatId,
    connectionSuccessMessage,
    token,
  );

  return successResponse(
    "Telegram connected",
    {
      connected: true,
      connection,
      confirmation,
    },
    { headers: noStoreHeaders },
  );
}
