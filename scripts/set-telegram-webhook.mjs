import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const webhookPath = "/api/v1/telegram/webhook";
const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

function withHttps(value) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}

function resolveCandidate() {
  return [
    process.argv[2],
    process.env.TELEGRAM_WEBHOOK_URL,
    process.env.TELEGRAM_PUBLIC_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ]
    .map((value) => value?.trim())
    .find(Boolean);
}

function buildWebhookUrl(candidate) {
  const url = new URL(withHttps(candidate));

  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = webhookPath;
  }

  return url;
}

function assertPublicWebhookUrl(url) {
  const localhostNames = new Set(["localhost", "127.0.0.1", "::1"]);

  if (localhostNames.has(url.hostname)) {
    throw new Error(
      "Telegram cannot reach localhost. Use an HTTPS ngrok URL or your deployed app URL.",
    );
  }

  if (url.protocol !== "https:") {
    throw new Error("Telegram webhooks require an HTTPS URL.");
  }
}

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is missing from the environment.");
}

const candidate = resolveCandidate();

if (!candidate) {
  throw new Error(
    "Pass a public URL, or set TELEGRAM_WEBHOOK_URL, TELEGRAM_PUBLIC_URL, NEXT_PUBLIC_APP_URL, VERCEL_PROJECT_PRODUCTION_URL, or VERCEL_URL.",
  );
}

const webhookUrl = buildWebhookUrl(candidate);
assertPublicWebhookUrl(webhookUrl);

console.info("TELEGRAM_BOT_TOKEN loaded: yes");
console.info(`Setting Telegram webhook to ${webhookUrl.toString()}`);

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    allowed_updates: ["message"],
    ...(secretToken ? { secret_token: secretToken } : {}),
    url: webhookUrl.toString(),
  }),
});
const body = await response.json().catch(() => null);

if (!response.ok || body?.ok === false) {
  throw new Error(
    body?.description ??
      `Telegram setWebhook failed with status ${response.status}.`,
  );
}

console.info("Telegram webhook configured successfully.");
