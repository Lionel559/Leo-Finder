import { errorResponse, successResponse } from "@/lib/api";
import { AuthError, requireCompletedOnboarding } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

async function getOpportunityId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  return id;
}

function isExpired(expiresAt: string | null) {
  return expiresAt ? new Date(expiresAt).getTime() <= Date.now() : false;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createSupabaseServerClient();

  try {
    const { user } = await requireCompletedOnboarding(supabase);
    const opportunityId = await getOpportunityId(context);
    const { data: opportunity, error: opportunityError } = await supabase
      .from("opportunities")
      .select("id,status,expires_at")
      .eq("id", opportunityId)
      .maybeSingle();

    if (opportunityError) {
      return errorResponse(
        "Opportunity could not be checked before saving.",
        500,
        { code: "OPPORTUNITY_SAVE_CHECK_FAILED", details: opportunityError.message },
        noStoreHeaders,
      );
    }

    if (!opportunity) {
      return errorResponse(
        "We could not find that opportunity.",
        404,
        { code: "OPPORTUNITY_NOT_FOUND" },
        noStoreHeaders,
      );
    }

    if (opportunity.status !== "published") {
      return errorResponse(
        "This opportunity is not available to save.",
        409,
        { code: "OPPORTUNITY_NOT_AVAILABLE" },
        noStoreHeaders,
      );
    }

    if (isExpired(opportunity.expires_at)) {
      return errorResponse(
        "This opportunity has expired and can no longer be saved.",
        409,
        { code: "OPPORTUNITY_EXPIRED" },
        noStoreHeaders,
      );
    }

    const { error } = await supabase.from("saved_opportunities").upsert(
      {
        user_id: user.id,
        opportunity_id: opportunityId,
      },
      { onConflict: "user_id,opportunity_id" },
    );

    if (error) {
      return errorResponse(
        "Opportunity could not be saved.",
        500,
        { code: "SAVE_OPPORTUNITY_FAILED", details: error.message },
        noStoreHeaders,
      );
    }

    return successResponse(
      "Opportunity saved",
      { saved: true, opportunityId },
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createSupabaseServerClient();

  try {
    const { user } = await requireCompletedOnboarding(supabase);
    const opportunityId = await getOpportunityId(context);
    const { error } = await supabase
      .from("saved_opportunities")
      .delete()
      .eq("user_id", user.id)
      .eq("opportunity_id", opportunityId);

    if (error) {
      return errorResponse(
        "Opportunity could not be unsaved.",
        500,
        { code: "UNSAVE_OPPORTUNITY_FAILED", details: error.message },
        noStoreHeaders,
      );
    }

    return successResponse(
      "Opportunity unsaved",
      { saved: false, opportunityId },
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
