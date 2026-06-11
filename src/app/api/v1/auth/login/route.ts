import { z } from "zod";

import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api";
import { getUserProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ValidationErrors } from "@/types";

export const dynamic = "force-dynamic";

const loginSchema = z
  .object({
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(1),
  })
  .strict();

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

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
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return validationErrorResponse(
      formatZodErrors(parsed.error),
      "Invalid login payload",
      noStoreHeaders,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return errorResponse(
      error?.message ?? "Invalid email or password.",
      401,
      { code: "AUTH_LOGIN_FAILED" },
      noStoreHeaders,
    );
  }

  const profile = await getUserProfile(data.user.id, supabase);

  return successResponse(
    "Login successful",
    {
      user: {
        id: data.user.id,
        email: data.user.email,
        createdAt: data.user.created_at,
      },
      profile,
    },
    { headers: noStoreHeaders },
  );
}
