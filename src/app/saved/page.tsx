import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { SavedPageClient } from "@/components/saved/saved-page-client";
import { AuthError, requireCompletedOnboarding } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Saved Opportunities | Leo Finder",
};

export default async function SavedPage() {
  const supabase = await createSupabaseServerClient();

  try {
    await requireCompletedOnboarding(supabase);
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.code === "ONBOARDING_REQUIRED") {
        redirect("/onboarding");
      }

      redirect("/login");
    }

    throw error;
  }

  return (
    <AppShell
      active="saved"
      title="Saved opportunities"
      subtitle="Review opportunities you saved from the feed and dashboard."
    >
      <SavedPageClient />
    </AppShell>
  );
}
