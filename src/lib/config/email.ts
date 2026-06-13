import "server-only";

const defaultSenderName = "Leo Finder";
const defaultSenderAddress = "onboarding@resend.dev";

function clean(value: string | undefined) {
  return value?.trim() || null;
}

function formatSender(value: string | undefined) {
  const sender = clean(value) ?? defaultSenderAddress;

  if (sender.includes("<")) {
    return sender;
  }

  return `${defaultSenderName} <${sender}>`;
}

export function getSupportEmail(source: NodeJS.ProcessEnv = process.env) {
  return clean(source.SUPPORT_EMAIL);
}

export function getContactEmailSender(
  source: NodeJS.ProcessEnv = process.env,
) {
  return formatSender(source.CONTACT_FROM_EMAIL ?? source.RESEND_FROM_EMAIL);
}

export function getConfiguredWelcomeEmailSender(
  source: NodeJS.ProcessEnv = process.env,
) {
  return formatSender(source.RESEND_FROM_EMAIL);
}
