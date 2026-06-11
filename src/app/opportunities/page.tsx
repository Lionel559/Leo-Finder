import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { OpportunitiesPageClient } from "@/components/opportunities/opportunities-page-client";
import { AuthError, requireCompletedOnboarding } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Opportunities | Leo Finder",
};

export default async function OpportunitiesPage() {
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
      active="opportunities"
      title="Opportunities"
      subtitle="Search, filter, save, and track opportunities from the database feed."
    >
      <OpportunitiesPageClient />
    </AppShell>
  );
}
