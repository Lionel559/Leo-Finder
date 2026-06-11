import { getTelegramBotToken } from "@/lib/telegram/config";

export const TELEGRAM_WEBHOOK_PATH = "/api/v1/telegram/webhook";

type TelegramWebhookSetupResult = {
  configured: boolean;
  reason?: string;
  response?: unknown;
  webhookUrl?: string;
};

const publicUrlEnvNames = [
  "TELEGRAM_WEBHOOK_URL",
  "TELEGRAM_PUBLIC_URL",
  "NEXT_PUBLIC_APP_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const;

function withHttps(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

export function resolveTelegramWebhookCandidate(
  source: NodeJS.ProcessEnv = process.env,
) {
  return publicUrlEnvNames
    .map((name) => source[name]?.trim())
    .find(Boolean);
}

export function buildTelegramWebhookUrl(candidate: string) {
  const url = new URL(withHttps(candidate));

  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = TELEGRAM_WEBHOOK_PATH;
  }

  return url;
}

export function getTelegramWebhookUrlProblem(url: URL) {
  const localhostNames = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

  if (localhostNames.has(url.hostname)) {
    return "Telegram cannot reach localhost webhooks. Use a public HTTPS app URL or an HTTPS ngrok URL for local testing.";
  }

  if (url.protocol !== "https:") {
    return "Telegram webhooks require an HTTPS URL.";
  }

  return null;
}

export async function setTelegramWebhook(
  source: NodeJS.ProcessEnv = process.env,
): Promise<TelegramWebhookSetupResult> {
  const token = getTelegramBotToken(source);

  if (!token) {
    console.warn(
      "[telegram webhook setup] skipped because TELEGRAM_BOT_TOKEN is missing.",
    );

    return {
      configured: false,
      reason: "missing_token",
    };
  }

  const candidate = resolveTelegramWebhookCandidate(source);

  if (!candidate) {
    console.warn(
      "[telegram webhook setup] skipped because no public app URL is configured.",
      {
        expectedEnv: publicUrlEnvNames,
      },
    );

    return {
      configured: false,
      reason: "missing_public_url",
    };
  }

  let webhookUrl: URL;

  try {
    webhookUrl = buildTelegramWebhookUrl(candidate);
  } catch (error) {
    console.error("[telegram webhook setup] invalid public URL.", {
      candidate,
      error,
    });

    return {
      configured: false,
      reason: "invalid_public_url",
    };
  }

  const urlProblem = getTelegramWebhookUrlProblem(webhookUrl);

  if (urlProblem) {
    console.warn("[telegram webhook setup] skipped.", {
      reason: urlProblem,
      webhookUrl: webhookUrl.toString(),
    });

    return {
      configured: false,
      reason: "invalid_webhook_url",
      webhookUrl: webhookUrl.toString(),
    };
  }

  const secretToken = source.TELEGRAM_WEBHOOK_SECRET?.trim();
  const payload: {
    allowed_updates: string[];
    secret_token?: string;
    url: string;
  } = {
    allowed_updates: ["message"],
    url: webhookUrl.toString(),
  };

  if (secretToken) {
    payload.secret_token = secretToken;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
    const responseBody = await response.json().catch(() => null);

    if (!response.ok || responseBody?.ok === false) {
      console.error("[telegram webhook setup] setWebhook failed.", {
        response: responseBody,
        status: response.status,
        webhookUrl: webhookUrl.toString(),
      });

      return {
        configured: false,
        reason: "telegram_api_error",
        response: responseBody,
        webhookUrl: webhookUrl.toString(),
      };
    }

    console.info("[telegram webhook setup] webhook configured.", {
      hasSecretToken: Boolean(secretToken),
      response: responseBody,
      webhookUrl: webhookUrl.toString(),
    });

    return {
      configured: true,
      response: responseBody,
      webhookUrl: webhookUrl.toString(),
    };
  } catch (error) {
    console.error("[telegram webhook setup] setWebhook request failed.", {
      error,
      webhookUrl: webhookUrl.toString(),
    });

    return {
      configured: false,
      reason: "request_failed",
      webhookUrl: webhookUrl.toString(),
    };
  }
}
