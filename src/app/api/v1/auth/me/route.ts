import { errorResponse, successResponse } from "@/lib/api";
import { AuthError, getUserProfile, requireAuth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

export async function GET() {
  const supabase = await createSupabaseServerClient();

  try {
    const user = await requireAuth(supabase);
    const profile = await getUserProfile(user.id, supabase);

    return successResponse(
      "Current user loaded",
      {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at,
        },
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
