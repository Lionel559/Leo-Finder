import { getTelegramBotToken } from "@/lib/telegram/config";

export type TelegramSendMessageResult = {
  error: string | null;
  response: unknown;
  sent: boolean;
};

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  token = getTelegramBotToken(),
): Promise<TelegramSendMessageResult> {
  if (!token) {
    const error = "TELEGRAM_BOT_TOKEN is missing.";
    console.error("[telegram message] sendMessage failed", {
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
      console.error("[telegram message] sendMessage failed", {
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

    console.info("[telegram message] sendMessage sent", {
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
    console.error("[telegram message] sendMessage failed", {
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
