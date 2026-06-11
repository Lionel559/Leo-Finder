import { z } from "zod";

import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api";
import { AuthError } from "@/lib/auth";
import {
  formatApplication,
  formatOpportunity,
  getOpportunityViewerContext,
  opportunitySelect,
  type DbOpportunity,
} from "@/lib/opportunities/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ValidationErrors } from "@/types";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

const updateApplicationSchema = z
  .object({
    status: z.enum([
      "saved",
      "applied",
      "interviewing",
      "offer_received",
      "rejected",
      "completed",
    ]),
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createSupabaseServerClient();

  try {
    const viewerContext = await getOpportunityViewerContext(supabase);
    const { id } = await context.params;
    const body = await readJson(request);
    const parsed = updateApplicationSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(
        formatZodErrors(parsed.error),
        "Invalid application payload",
        noStoreHeaders,
      );
    }

    const appliedAt =
      parsed.data.status === "applied" ? new Date().toISOString() : undefined;
    const { data: applicationData, error: applicationError } = await supabase
      .from("applications")
      .update({
        status: parsed.data.status,
        ...(appliedAt ? { applied_at: appliedAt } : {}),
      })
      .eq("id", id)
      .eq("user_id", viewerContext.user.id)
      .select("id,opportunity_id,status,applied_at,next_step_at,notes,created_at,updated_at")
      .single();

    if (applicationError) {
      return errorResponse(
        "Application could not be updated.",
        500,
        { code: "APPLICATION_UPDATE_FAILED", details: applicationError.message },
        noStoreHeaders,
      );
    }

    const { data: opportunityData, error: opportunityError } = await supabase
      .from("opportunities")
      .select(opportunitySelect)
      .eq("id", applicationData.opportunity_id)
      .maybeSingle();

    if (opportunityError) {
      return errorResponse(
        "Application was updated, but the opportunity could not be loaded.",
        500,
        { code: "OPPORTUNITY_LOAD_FAILED", details: opportunityError.message },
        noStoreHeaders,
      );
    }

    const opportunity = opportunityData
      ? formatOpportunity(opportunityData as DbOpportunity, viewerContext)
      : null;

    return successResponse(
      "Application updated",
      {
        application: formatApplication(applicationData, opportunity),
      },
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
