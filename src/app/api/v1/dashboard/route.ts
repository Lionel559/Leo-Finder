import { errorResponse, successResponse } from "@/lib/api";
import { AuthError } from "@/lib/auth";
import {
  filterPublishedRows,
  formatOpportunity,
  getApplicationsWithOpportunities,
  getCurrentResumeStatus,
  getOpportunityViewerContext,
  opportunitySelect,
  type DbOpportunity,
} from "@/lib/opportunities/server";
import { getProfileCompletion } from "@/lib/profile/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

export async function GET() {
  const supabase = await createSupabaseServerClient();

  try {
    const context = await getOpportunityViewerContext(supabase);
    const [
      opportunitiesResult,
      applications,
      resumeStatus,
      opportunitiesCountResult,
      profileCompletion,
    ] = await Promise.all([
      supabase
        .from("opportunities")
        .select(opportunitySelect)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(100),
      getApplicationsWithOpportunities(supabase, context),
      getCurrentResumeStatus(supabase, context.user.id),
      supabase
        .from("opportunities")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      getProfileCompletion(context.user.id, supabase),
    ]);

    if (opportunitiesResult.error) {
      return errorResponse(
        "Dashboard opportunities could not be loaded.",
        500,
        {
          code: "DASHBOARD_OPPORTUNITIES_FAILED",
          details: opportunitiesResult.error.message,
        },
        noStoreHeaders,
      );
    }

    if (opportunitiesCountResult.error) {
      return errorResponse(
        "Opportunity count could not be loaded.",
        500,
        {
          code: "OPPORTUNITY_COUNT_FAILED",
          details: opportunitiesCountResult.error.message,
        },
        noStoreHeaders,
      );
    }

    const opportunities = filterPublishedRows(
      (opportunitiesResult.data ?? []) as DbOpportunity[],
    ).map((row) => formatOpportunity(row, context));
    const recommendedOpportunities = [...opportunities]
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 4);
    const recentOpportunities = [...opportunities]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 6);
    return successResponse(
      "Dashboard loaded",
      {
        user: {
          id: context.user.id,
          email: context.user.email,
        },
        profile: {
          fullName: context.profile.full_name,
          preferredRoles: context.profile.preferred_roles,
          experienceLevel: context.profile.experience_level,
          location: context.profile.location,
          onboardingCompleted: context.profile.onboarding_completed,
        },
        stats: {
          profileCompletionScore: profileCompletion.score,
          totalOpportunities: opportunitiesCountResult.count ?? opportunities.length,
          savedOpportunities: context.savedOpportunityIds.size,
          applicationsTracked: applications.length,
          resumeStatus,
        },
        recommendedOpportunities,
        recentOpportunities,
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
