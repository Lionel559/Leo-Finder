import { z } from "zod";

import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api";
import { AuthError, requireAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ValidationErrors } from "@/types";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};
const resumeBucketName = "resumes";

const deleteAccountSchema = z
  .object({
    confirmation: z.literal("DELETE"),
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
  const parsed = deleteAccountSchema.safeParse(body);

  if (!parsed.success) {
    return validationErrorResponse(
      formatZodErrors(parsed.error),
      "Type DELETE to confirm account deletion",
      noStoreHeaders,
    );
  }

  const supabase = await createSupabaseServerClient();

  try {
    const user = await requireAuth(supabase);
    const admin = createSupabaseAdminClient();
    const { data: resumeRows, error: resumeError } = await admin
      .from("resume_uploads")
      .select("storage_path")
      .eq("user_id", user.id);

    if (resumeError) {
      return errorResponse(
        "Resume files could not be prepared for deletion.",
        500,
        { code: "ACCOUNT_RESUME_LOOKUP_FAILED", details: resumeError.message },
        noStoreHeaders,
      );
    }

    const storagePaths = (resumeRows ?? [])
      .map((row) => row.storage_path)
      .filter((path): path is string => typeof path === "string" && path.length > 0);

    if (storagePaths.length > 0) {
      const { error: storageError } = await admin.storage
        .from(resumeBucketName)
        .remove(storagePaths);

      if (storageError) {
        console.warn("[account] resume storage cleanup skipped", {
          error: storageError.message,
          userId: user.id,
        });
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      return errorResponse(
        deleteError.message,
        500,
        { code: "ACCOUNT_DELETE_FAILED" },
        noStoreHeaders,
      );
    }

    await supabase.auth.signOut().catch(() => null);

    return successResponse("Account deleted", undefined, {
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
