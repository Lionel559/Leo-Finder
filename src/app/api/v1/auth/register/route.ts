import { z } from "zod";

import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api";
import {
  getWelcomeEmailSender,
  saveWelcomeEmailAttemptLog,
  sendWelcomeEmail,
  welcomeEmailSubject,
} from "@/lib/notifications";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ValidationErrors } from "@/types";

export const dynamic = "force-dynamic";

const registerSchema = z
  .object({
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(8),
    fullName: z.string().trim().min(1).max(120).optional(),
    headline: z.string().trim().max(160).optional(),
    location: z.string().trim().max(120).optional(),
  })
  .strict();

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

type RegistrationDbError = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message: string;
};

type RegistrationQueryLog = {
  action: "insert" | "select" | "upsert";
  filters?: Record<string, unknown>;
  onConflict?: string;
  select?: string;
  single?: boolean;
  table: string;
  values?: Record<string, unknown>;
};

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
type WelcomeEmailResult = Awaited<ReturnType<typeof sendWelcomeEmail>>;

const profileSelect =
  "id,email,full_name,headline,bio,location,timezone,avatar_url,website_url,portfolio_url,github_url,linkedin_url,preferred_roles,experience_level,onboarding_completed,created_at,updated_at";
const preferencesSelect = "id,user_id,created_at,updated_at";
const freePlanSelect = "id,slug,name";
const subscriptionSelect =
  "id,status,current_period_start,current_period_end,created_at";

function formatZodErrors(error: z.ZodError): ValidationErrors {
  return error.flatten().fieldErrors as ValidationErrors;
}

function formatDbError(error: RegistrationDbError) {
  return {
    code: error.code ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
    message: error.message,
  };
}

function logRegistrationDbSuccess(
  operation: string,
  userId: string,
  query: RegistrationQueryLog,
  result?: Record<string, unknown>,
) {
  console.info(`[register] ${operation} success`, {
    query,
    result,
    userId,
  });
}

function logRegistrationDbFailure(
  operation: string,
  userId: string,
  query: RegistrationQueryLog,
  error: RegistrationDbError,
) {
  console.error(`[register] ${operation} failure`, {
    error: formatDbError(error),
    query,
    userId,
  });
}

async function rollbackCreatedAuthUser(
  admin: SupabaseAdminClient,
  userId: string,
  reason: string,
) {
  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) {
    console.error("[register] auth user rollback failure", {
      error: {
        message: error.message,
        name: error.name,
        status: error.status,
      },
      reason,
      userId,
    });
    return;
  }

  console.info("[register] auth user rollback success", {
    reason,
    userId,
  });
}

async function setupFailureResponse({
  admin,
  code,
  error,
  operation,
  query,
  status = 500,
  userId,
}: {
  admin: SupabaseAdminClient;
  code: string;
  error: RegistrationDbError;
  operation: string;
  query: RegistrationQueryLog;
  status?: number;
  userId: string;
}) {
  logRegistrationDbFailure(operation, userId, query, error);
  await rollbackCreatedAuthUser(admin, userId, code);

  return errorResponse(
    error.message,
    status,
    {
      code,
      details: {
        databaseError: formatDbError(error),
        operation,
        query,
      },
    },
    noStoreHeaders,
  );
}

function logWelcomeEmailStarted({
  recipientEmail,
  senderEmail,
  userId,
}: {
  recipientEmail: string;
  senderEmail: string;
  userId: string;
}) {
  console.info("[register] welcome email started", {
    recipient: recipientEmail,
    sender: senderEmail,
    status: "started",
    subject: welcomeEmailSubject,
    userId,
  });
}

function logWelcomeEmailResult({
  result,
  userId,
}: {
  result: WelcomeEmailResult;
  userId: string;
}) {
  if (result.sent) {
    console.info("[register] welcome email sent", {
      providerMessageId: result.id,
      recipient: result.recipientEmail,
      resendError: result.resendError,
      resendResponse: result.resendResponse,
      sender: result.senderEmail,
      status: "sent",
      subject: result.subject,
      userId,
    });
    return;
  }

  if (result.status === "development_blocked") {
    console.warn("[register] welcome email development blocked", {
      adminNote: result.adminNote,
      error: result.error,
      recipient: result.recipientEmail,
      reason: result.reason,
      resendError: result.resendError,
      resendResponse: result.resendResponse,
      sender: result.senderEmail,
      status: result.status,
      subject: result.subject,
      userId,
    });
    return;
  }

  const logPayload = {
    error: result.error,
    recipient: result.recipientEmail,
    reason: result.reason,
    resendError: result.resendError,
    resendResponse: result.resendResponse,
    sender: result.senderEmail,
    status: result.status,
    subject: result.subject,
    userId,
  };

  if (result.status === "skipped") {
    console.info("[register] email skipped", logPayload);
    return;
  }

  console.error("[register] email failed", logPayload);
}

function formatUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown welcome email error.";
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = await readJson(request);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return validationErrorResponse(
      formatZodErrors(parsed.error),
      "Invalid registration payload",
      noStoreHeaders,
    );
  }

  const { email, password, fullName, headline, location } = parsed.data;
  const admin = createSupabaseAdminClient();

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

  if (authError || !authData.user) {
    const status = authError?.message.toLowerCase().includes("already")
      ? 409
      : 400;

    return errorResponse(
      authError?.message ?? "Registration failed.",
      status,
      { code: "AUTH_REGISTER_FAILED" },
      noStoreHeaders,
    );
  }

  const user = authData.user;
  console.info("[register] user creation success", {
    createdAt: user.created_at,
    email: user.email,
    userId: user.id,
  });

  const profileValues = {
    id: user.id,
    email,
    full_name: fullName ?? null,
    headline: headline ?? null,
    location: location ?? null,
  };
  const profileQuery: RegistrationQueryLog = {
    action: "upsert",
    onConflict: "id",
    select: profileSelect,
    single: true,
    table: "profiles",
    values: profileValues,
  };
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .upsert(profileValues, { onConflict: "id" })
    .select(profileSelect)
    .single();

  if (profileError) {
    return setupFailureResponse({
      admin,
      code: "PROFILE_SETUP_FAILED",
      error: profileError,
      operation: "profile creation",
      query: profileQuery,
      userId: user.id,
    });
  }

  logRegistrationDbSuccess("profile creation", user.id, profileQuery, {
    profileId: profile.id,
  });

  const preferencesValues = { user_id: user.id };
  const preferencesQuery: RegistrationQueryLog = {
    action: "upsert",
    onConflict: "user_id",
    select: preferencesSelect,
    single: true,
    table: "user_preferences",
    values: preferencesValues,
  };
  const { data: preferences, error: preferencesError } = await admin
    .from("user_preferences")
    .upsert(preferencesValues, { onConflict: "user_id" })
    .select(preferencesSelect)
    .single();

  if (preferencesError) {
    return setupFailureResponse({
      admin,
      code: "PREFERENCES_SETUP_FAILED",
      error: preferencesError,
      operation: "user_preferences creation",
      query: preferencesQuery,
      userId: user.id,
    });
  }

  logRegistrationDbSuccess(
    "user_preferences creation",
    user.id,
    preferencesQuery,
    {
      preferencesId: preferences.id,
    },
  );

  const freePlanQuery: RegistrationQueryLog = {
    action: "select",
    filters: { slug: "free" },
    select: freePlanSelect,
    single: true,
    table: "plans",
  };
  const { data: freePlan, error: planError } = await admin
    .from("plans")
    .select(freePlanSelect)
    .eq("slug", "free")
    .single();

  if (planError || !freePlan) {
    return setupFailureResponse({
      admin,
      code: "FREE_PLAN_MISSING",
      error: planError ?? {
        code: "FREE_PLAN_MISSING",
        message: 'Free plan with slug "free" was not found.',
      },
      operation: "subscription creation",
      query: freePlanQuery,
      userId: user.id,
    });
  }

  const currentPeriodStart = new Date().toISOString().slice(0, 10);
  const subscriptionValues = {
    user_id: user.id,
    plan_id: freePlan.id,
    status: "active",
    current_period_start: currentPeriodStart,
  };
  const subscriptionQuery: RegistrationQueryLog = {
    action: "insert",
    select: subscriptionSelect,
    single: true,
    table: "subscriptions",
    values: subscriptionValues,
  };
  const { data: subscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .insert(subscriptionValues)
    .select(subscriptionSelect)
    .single();

  if (subscriptionError) {
    return setupFailureResponse({
      admin,
      code: "SUBSCRIPTION_SETUP_FAILED",
      error: subscriptionError,
      operation: "subscription creation",
      query: subscriptionQuery,
      userId: user.id,
    });
  }

  logRegistrationDbSuccess(
    "subscription creation",
    user.id,
    subscriptionQuery,
    {
      subscriptionId: subscription.id,
    },
  );

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return errorResponse(
      "User was created, but starting the session failed.",
      500,
      { code: "AUTH_SESSION_FAILED", details: signInError.message },
      noStoreHeaders,
    );
  }

  const senderEmail = getWelcomeEmailSender();

  logWelcomeEmailStarted({
    recipientEmail: email,
    senderEmail,
    userId: user.id,
  });

  const welcomeEmail = await sendWelcomeEmail({
    userId: user.id,
    email,
    fullName,
  }).catch((error: unknown): WelcomeEmailResult => ({
    error: `Resend request failed. ${formatUnknownError(error)}`,
    recipientEmail: email,
    reason: "request_failed",
    resendError: {
      message: formatUnknownError(error),
    },
    resendResponse: null,
    senderEmail,
    sent: false,
    status: "failed",
    subject: welcomeEmailSubject,
  }));

  logWelcomeEmailResult({
    result: welcomeEmail,
    userId: user.id,
  });

  await saveWelcomeEmailAttemptLog({
    result: welcomeEmail,
    source: "register",
    userId: user.id,
  });

  return successResponse(
    "Registration successful",
    {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
      profile,
      preferencesCreated: true,
      subscription: {
        ...subscription,
        plan: freePlan,
      },
    },
    { status: 201, headers: noStoreHeaders },
  );
}
