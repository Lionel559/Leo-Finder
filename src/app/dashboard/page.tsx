import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { AuthError, requireCompletedOnboarding } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard | Leo Finder",
};

function getDisplayName(profileName: string | null | undefined, email?: string) {
  if (profileName) {
    return profileName;
  }

  return email?.split("@")[0] ?? "there";
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  let fallbackName = "there";

  try {
    const { user, profile } = await requireCompletedOnboarding(supabase);
    fallbackName = getDisplayName(profile.full_name, user.email);
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
      active="dashboard"
      title="Dashboard"
      subtitle="Recommended opportunities, profile progress, resume status, and application activity."
    >
      <DashboardClient fallbackName={fallbackName} />
    </AppShell>
  );
}
