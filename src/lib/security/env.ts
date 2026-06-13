import { z } from "zod";

const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

export const supabasePublicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export const supabaseServiceEnvSchema = supabasePublicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  QWEN_API_KEY: optionalSecret,
  CONTACT_FROM_EMAIL: optionalSecret,
  RESEND_API_KEY: optionalSecret,
  RESEND_FROM_EMAIL: optionalSecret,
  SUPPORT_EMAIL: optionalSecret,
  TELEGRAM_BOT_TOKEN: optionalSecret,
  TELEGRAM_BOT_USERNAME: optionalSecret,
  TELEGRAM_BOT_USERNAME_FALLBACK: optionalSecret,
  TELEGRAM_PUBLIC_URL: optionalSecret,
  TELEGRAM_WEBHOOK_SECRET: optionalSecret,
  TELEGRAM_WEBHOOK_URL: optionalSecret,
  NEXT_PUBLIC_APP_URL: optionalSecret,
});

export type AppEnv = z.infer<typeof envSchema>;
export type SupabasePublicEnv = z.infer<typeof supabasePublicEnvSchema>;
export type SupabaseServiceEnv = z.infer<typeof supabaseServiceEnvSchema>;

let cachedEnv: AppEnv | null = null;
let cachedSupabasePublicEnv: SupabasePublicEnv | null = null;
let cachedSupabaseServiceEnv: SupabaseServiceEnv | null = null;

export function validateEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const invalidKeys = result.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean)
      .join(", ");

    throw new Error(
      `Invalid Leo Finder environment variables: ${invalidKeys}`,
    );
  }

  return result.data;
}

export function validateSupabasePublicEnv(
  source: NodeJS.ProcessEnv = process.env,
): SupabasePublicEnv {
  const result = supabasePublicEnvSchema.safeParse(source);

  if (!result.success) {
    const invalidKeys = result.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean)
      .join(", ");

    throw new Error(
      `Invalid Supabase public environment variables: ${invalidKeys}`,
    );
  }

  return result.data;
}

export function validateSupabaseServiceEnv(
  source: NodeJS.ProcessEnv = process.env,
): SupabaseServiceEnv {
  const result = supabaseServiceEnvSchema.safeParse(source);

  if (!result.success) {
    const invalidKeys = result.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean)
      .join(", ");

    throw new Error(
      `Invalid Supabase service environment variables: ${invalidKeys}`,
    );
  }

  return result.data;
}

export function getEnv(): AppEnv {
  cachedEnv ??= validateEnv();

  return cachedEnv;
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  cachedSupabasePublicEnv ??= validateSupabasePublicEnv();

  return cachedSupabasePublicEnv;
}

export function getSupabaseServiceEnv(): SupabaseServiceEnv {
  cachedSupabaseServiceEnv ??= validateSupabaseServiceEnv();

  return cachedSupabaseServiceEnv;
}

export function requireEnvVar(
  name: keyof AppEnv,
  source: NodeJS.ProcessEnv = process.env,
): string {
  const value = source[name];

  if (!value) {
    throw new Error(`Missing required Leo Finder environment variable: ${name}`);
  }

  return value;
}
