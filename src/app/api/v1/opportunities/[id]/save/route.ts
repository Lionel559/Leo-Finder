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

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createSupabaseServerClient();

  try {
    const { user } = await requireCompletedOnboarding(supabase);
    const opportunityId = await getOpportunityId(context);
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
