import { z } from "zod";

import { errorResponse, successResponse, validationErrorResponse } from "@/lib/api";
import { AuthError, requireCompletedOnboarding } from "@/lib/auth";
import {
  loadMatchingProfile,
  loadOpportunityForMatching,
  scoreOpportunityMatch,
  toMatchScoreApiResult,
} from "@/lib/matching/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ValidationErrors } from "@/types";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

const matchScoreSchema = z
  .object({
    user_id: z.string().uuid().optional(),
    opportunity_id: z.string().uuid(),
  })
  .strict();

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function formatZodErrors(error: z.ZodError): ValidationErrors {
  return error.flatten().fieldErrors as ValidationErrors;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const { user } = await requireCompletedOnboarding(supabase);
    const body = await readJson(request);
    const parsed = matchScoreSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(
        formatZodErrors(parsed.error),
        "Invalid match score payload",
        noStoreHeaders,
      );
    }

    const requestedUserId = parsed.data.user_id ?? user.id;

    if (requestedUserId !== user.id) {
      return errorResponse(
        "You can only calculate match scores for your own account.",
        403,
        { code: "MATCH_USER_FORBIDDEN" },
        noStoreHeaders,
      );
    }

    const opportunity = await loadOpportunityForMatching(
      supabase,
      parsed.data.opportunity_id,
    );

    if (!opportunity) {
      return errorResponse(
        "Opportunity not found.",
        404,
        { code: "OPPORTUNITY_NOT_FOUND" },
        noStoreHeaders,
      );
    }

    const profile = await loadMatchingProfile(supabase, user.id);
    const match = await scoreOpportunityMatch(profile, opportunity, {
      includeAiExplanation: true,
      saveHistory: true,
    });

    return successResponse(
      "Match score calculated",
      toMatchScoreApiResult(match),
      { headers: noStoreHeaders },
    );
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
