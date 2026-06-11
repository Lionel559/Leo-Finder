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
  getApplicationsWithOpportunities,
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

const createApplicationSchema = z
  .object({
    opportunityId: z.string().uuid(),
    status: z
      .enum([
        "saved",
        "applied",
        "interviewing",
        "offer_received",
        "rejected",
        "completed",
      ])
      .default("saved"),
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

export async function GET() {
  const supabase = await createSupabaseServerClient();

  try {
    const context = await getOpportunityViewerContext(supabase);
    const applications = await getApplicationsWithOpportunities(supabase, context);

    return successResponse(
      "Applications loaded",
      {
        applications,
        total: applications.length,
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

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const context = await getOpportunityViewerContext(supabase);
    const body = await readJson(request);
    const parsed = createApplicationSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(
        formatZodErrors(parsed.error),
        "Invalid application payload",
        noStoreHeaders,
      );
    }

    const { opportunityId, status } = parsed.data;
    const { data: opportunityData, error: opportunityError } = await supabase
      .from("opportunities")
      .select(opportunitySelect)
      .eq("id", opportunityId)
      .eq("status", "published")
      .maybeSingle();

    if (opportunityError) {
      return errorResponse(
        "Opportunity could not be loaded.",
        500,
        { code: "OPPORTUNITY_LOAD_FAILED", details: opportunityError.message },
        noStoreHeaders,
      );
    }

    if (!opportunityData) {
      return errorResponse(
        "Opportunity not found.",
        404,
        { code: "OPPORTUNITY_NOT_FOUND" },
        noStoreHeaders,
      );
    }

    const opportunity = formatOpportunity(opportunityData as DbOpportunity, context);
    const { data: applicationData, error: applicationError } = await supabase
      .from("applications")
      .upsert(
        {
          user_id: context.user.id,
          opportunity_id: opportunityId,
          status,
          applied_at: status === "applied" ? new Date().toISOString() : null,
          opportunity_snapshot: {
            title: opportunity.title,
            organization: opportunity.organization,
            category: opportunity.category,
            deadline: opportunity.deadline,
            sourceUrl: opportunity.sourceUrl,
          },
        },
        { onConflict: "user_id,opportunity_id" },
      )
      .select("id,opportunity_id,status,applied_at,next_step_at,notes,created_at,updated_at")
      .single();

    if (applicationError) {
      return errorResponse(
        "Application could not be tracked.",
        500,
        { code: "APPLICATION_TRACK_FAILED", details: applicationError.message },
        noStoreHeaders,
      );
    }

    return successResponse(
      "Application tracked",
      {
        application: formatApplication(applicationData, opportunity),
      },
      { status: 201, headers: noStoreHeaders },
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
