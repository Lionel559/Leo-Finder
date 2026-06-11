import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { OpportunityDetailClient } from "@/components/opportunities/opportunity-detail-client";
import { AuthError, requireCompletedOnboarding } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Opportunity Details | Leo Finder",
};

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

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
      title="Opportunity details"
      subtitle="Review the full details, save the opportunity, or start tracking your application."
    >
      <OpportunityDetailClient opportunityId={id} />
    </AppShell>
  );
}
