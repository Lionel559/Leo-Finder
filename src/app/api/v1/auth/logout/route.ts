import { errorResponse, successResponse } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return errorResponse(
      error.message,
      400,
      { code: "AUTH_LOGOUT_FAILED" },
      noStoreHeaders,
    );
  }

  return successResponse("Logout successful", undefined, {
    headers: noStoreHeaders,
  });
}
