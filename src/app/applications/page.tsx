import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { ApplicationsPageClient } from "@/components/applications/applications-page-client";
import { AuthError, requireCompletedOnboarding } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Applications | Leo Finder",
};

export default async function ApplicationsPage() {
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
      active="applications"
      title="Applications"
      subtitle="Track application progress across saved, applied, interviewing, offer, rejected, and completed statuses."
    >
      <ApplicationsPageClient />
    </AppShell>
  );
}
