export const DEFAULT_TELEGRAM_BOT_USERNAME = "Leofinderzz_Bot";

export function getTelegramBotUsername(
  source: NodeJS.ProcessEnv = process.env,
) {
  return source.TELEGRAM_BOT_USERNAME?.trim() || DEFAULT_TELEGRAM_BOT_USERNAME;
}

export function getTelegramBotToken(source: NodeJS.ProcessEnv = process.env) {
  return source.TELEGRAM_BOT_TOKEN?.trim() || null;
}

export function getTelegramDeepLink(
  code: string,
  username = getTelegramBotUsername(),
) {
  return `https://t.me/${username}?start=${encodeURIComponent(code)}`;
}

export function getTelegramInstruction(code: string) {
  return `Open our Telegram bot and send /start ${code}`;
}
