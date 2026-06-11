import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { TelegramConnectionCard } from "@/components/telegram/telegram-connection-card";
import { AuthError, requireCompletedOnboarding } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings | Leo Finder",
};

export default async function SettingsPage() {
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
      active="settings"
      title="Settings"
      subtitle="Manage account-level connections and delivery preferences."
    >
      <div className="max-w-3xl">
        <TelegramConnectionCard />
      </div>
    </AppShell>
  );
}
