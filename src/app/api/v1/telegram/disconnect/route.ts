import { errorResponse, successResponse } from "@/lib/api";
import { AuthError, requireAuth } from "@/lib/auth";
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
    const admin = createSupabaseAdminClient();

    const { error: connectionError } = await admin
      .from("telegram_connections")
      .update({ status: "revoked" })
      .eq("user_id", user.id)
      .eq("status", "active");

    if (connectionError) {
      return errorResponse(
        connectionError.message,
        500,
        { code: "TELEGRAM_DISCONNECT_FAILED", details: connectionError.message },
        noStoreHeaders,
      );
    }

    const { error: attemptError } = await admin
      .from("telegram_connection_attempts")
      .update({ status: "canceled" })
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (attemptError) {
      return errorResponse(
        attemptError.message,
        500,
        { code: "TELEGRAM_DISCONNECT_FAILED", details: attemptError.message },
        noStoreHeaders,
      );
    }

    return successResponse(
      "Telegram connection disconnected",
      {
        status: "not_connected",
        connection: null,
        attempt: null,
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
