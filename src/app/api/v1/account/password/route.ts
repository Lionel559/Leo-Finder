import { z } from "zod";

import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api";
import { AuthError, requireAuth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ValidationErrors } from "@/types";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

const passwordUpdateSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  })
  .strict();

function formatZodErrors(error: z.ZodError): ValidationErrors {
  return error.flatten().fieldErrors as ValidationErrors;
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
  const parsed = passwordUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return validationErrorResponse(
      formatZodErrors(parsed.error),
      "Invalid password payload",
      noStoreHeaders,
    );
  }

  const supabase = await createSupabaseServerClient();

  try {
    const user = await requireAuth(supabase);

    if (!user.email) {
      return errorResponse(
        "This account does not have an email login.",
        400,
        { code: "PASSWORD_EMAIL_MISSING" },
        noStoreHeaders,
      );
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.currentPassword,
    });

    if (signInError) {
      return errorResponse(
        "Current password is incorrect.",
        400,
        { code: "CURRENT_PASSWORD_INVALID" },
        noStoreHeaders,
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });

    if (updateError) {
      return errorResponse(
        updateError.message,
        400,
        { code: "PASSWORD_UPDATE_FAILED" },
        noStoreHeaders,
      );
    }

    return successResponse("Password updated", undefined, {
      headers: noStoreHeaders,
    });
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
