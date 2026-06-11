import { errorResponse, successResponse } from "@/lib/api";
import { AuthError } from "@/lib/auth";
import {
  applyMatchToOpportunity,
  loadMatchingProfile,
  scoreOpportunityMatch,
} from "@/lib/matching/server";
import {
  filterPublishedRows,
  formatOpportunity,
  getOpportunityViewerContext,
  opportunitySelect,
  type DbOpportunity,
} from "@/lib/opportunities/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createSupabaseServerClient();

  try {
    const viewerContext = await getOpportunityViewerContext(supabase);
    const { id } = await context.params;
    const { data, error } = await supabase
      .from("opportunities")
      .select(opportunitySelect)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return errorResponse(
        "Opportunity could not be loaded.",
        500,
        { code: "OPPORTUNITY_LOAD_FAILED", details: error.message },
        noStoreHeaders,
      );
    }

    const rows = filterPublishedRows(data ? [data as DbOpportunity] : []);

    if (rows.length === 0) {
      return errorResponse(
        "Opportunity not found.",
        404,
        { code: "OPPORTUNITY_NOT_FOUND" },
        noStoreHeaders,
      );
    }

    const matchingProfile = await loadMatchingProfile(
      supabase,
      viewerContext.user.id,
    );
    const match = await scoreOpportunityMatch(matchingProfile, rows[0], {
      saveHistory: true,
    });
    const opportunity = applyMatchToOpportunity(
      formatOpportunity(rows[0], viewerContext),
      match,
    );

    return successResponse(
      "Opportunity loaded",
      { opportunity },
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
