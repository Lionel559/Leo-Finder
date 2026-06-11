import { errorResponse, successResponse } from "@/lib/api";
import { AuthError, requireCompletedOnboarding } from "@/lib/auth";
import {
  applyMatchToOpportunity,
  loadMatchingProfile,
  saveMatchScoreResult,
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

function getLimit(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 12;
  }

  return Math.max(1, Math.min(Math.floor(parsed), 50));
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const { user } = await requireCompletedOnboarding(supabase);
    const viewerContext = await getOpportunityViewerContext(supabase);
    const matchingProfile = await loadMatchingProfile(supabase, user.id);
    const url = new URL(request.url);
    const limit = getLimit(url.searchParams.get("limit"));
    const { data, error } = await supabase
      .from("opportunities")
      .select(opportunitySelect)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return errorResponse(
        "Recommendations could not be loaded.",
        500,
        { code: "RECOMMENDATIONS_LOAD_FAILED", details: error.message },
        noStoreHeaders,
      );
    }

    const scoredOpportunities = await Promise.all(
      filterPublishedRows((data ?? []) as DbOpportunity[]).map(async (row) => {
        const match = await scoreOpportunityMatch(matchingProfile, row);
        const opportunity = applyMatchToOpportunity(
          formatOpportunity(row, viewerContext),
          match,
        );

        return {
          match,
          opportunity,
        };
      }),
    );
    const ranked = scoredOpportunities
      .sort((a, b) => b.match.overallScore - a.match.overallScore)
      .slice(0, limit);

    await Promise.all(
      ranked.map(({ match }) =>
        saveMatchScoreResult(match).catch((saveError: unknown) => {
          console.error("[recommendations] recommendation_history insert failed", {
            error:
              saveError instanceof Error ? saveError.message : String(saveError),
            opportunityId: match.opportunityId,
            userId: match.userId,
          });
        }),
      ),
    );

    return successResponse(
      "Recommendations loaded",
      {
        opportunities: ranked.map(({ opportunity }) => opportunity),
        total: scoredOpportunities.length,
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
