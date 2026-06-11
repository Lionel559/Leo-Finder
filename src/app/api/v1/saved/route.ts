import { errorResponse, successResponse } from "@/lib/api";
import { AuthError } from "@/lib/auth";
import {
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

export async function GET() {
  const supabase = await createSupabaseServerClient();

  try {
    const context = await getOpportunityViewerContext(supabase);
    const opportunityIds = [...context.savedOpportunityIds];

    if (opportunityIds.length === 0) {
      return successResponse(
        "Saved opportunities loaded",
        { opportunities: [], total: 0 },
        { headers: noStoreHeaders },
      );
    }

    const { data, error } = await supabase
      .from("opportunities")
      .select(opportunitySelect)
      .in("id", opportunityIds)
      .eq("status", "published");

    if (error) {
      return errorResponse(
        "Saved opportunities could not be loaded.",
        500,
        { code: "SAVED_OPPORTUNITIES_LOAD_FAILED", details: error.message },
        noStoreHeaders,
      );
    }

    const opportunities = ((data ?? []) as DbOpportunity[])
      .map((row) => formatOpportunity(row, context))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    return successResponse(
      "Saved opportunities loaded",
      {
        opportunities,
        total: opportunities.length,
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
