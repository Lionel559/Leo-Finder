import { errorResponse, successResponse } from "@/lib/api";
import {
  AuthError,
  getCoreOnboardingStatus,
  requireAuth,
} from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

export async function POST() {
  const supabase = await createSupabaseServerClient();

  try {
    const user = await requireAuth(supabase);
    const coreOnboarding = await getCoreOnboardingStatus(user.id, supabase);

    if (!coreOnboarding.completed) {
      return errorResponse(
        "Complete the required onboarding steps before entering the dashboard.",
        409,
        { code: "CORE_ONBOARDING_REQUIRED" },
        noStoreHeaders,
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id)
      .select(
        "id,email,full_name,preferred_roles,experience_level,location,onboarding_completed,updated_at",
      )
      .single();

    if (profileError) {
      return errorResponse(
        "Onboarding could not be completed.",
        500,
        { code: "ONBOARDING_COMPLETE_FAILED", details: profileError.message },
        noStoreHeaders,
      );
    }

    return successResponse(
      "Onboarding completed",
      {
        profile,
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
