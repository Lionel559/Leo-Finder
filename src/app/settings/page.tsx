import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { SettingsClient } from "@/components/settings/settings-client";
import { AuthError, requireCompletedOnboarding } from "@/lib/auth";
import {
  getProfileCompletion,
  getUserPreferences,
  getUserResume,
  getUserSkills,
} from "@/lib/profile/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings | Leo Finder",
};

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  let userEmail = "";
  let settingsData: Awaited<ReturnType<typeof getSettingsData>> | null = null;

  try {
    const { profile, user } = await requireCompletedOnboarding(supabase);
    userEmail = user.email ?? profile.email ?? "";
    settingsData = await getSettingsData(user.id, profile, supabase);
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
      {settingsData ? (
        <SettingsClient userEmail={userEmail} {...settingsData} />
      ) : null}
    </AppShell>
  );
}

async function getSettingsData(
  userId: string,
  profile: Awaited<ReturnType<typeof requireCompletedOnboarding>>["profile"],
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
) {
  const [preferences, skills, resume, completion] = await Promise.all([
    getUserPreferences(userId, supabase),
    getUserSkills(userId, supabase, { source: "user" }),
    getUserResume(userId, supabase),
    getProfileCompletion(userId, supabase),
  ]);

  return {
    initialProfile: {
      fullName: profile.full_name ?? "",
      bio: profile.bio ?? "",
      experienceLevel: profile.experience_level ?? "beginner",
      preferredRoles: profile.preferred_roles ?? [],
      preferredLocations: preferences.preferredLocations,
      portfolioUrl: profile.portfolio_url ?? profile.website_url ?? "",
      githubUrl: profile.github_url ?? "",
      linkedinUrl: profile.linkedin_url ?? "",
    },
    initialSkills: skills.map((skill) => skill.name),
    initialResume: resume
      ? {
          id: resume.id,
          fileName: resume.fileName,
          fileUrl: resume.fileUrl,
          signedUrl: null,
          storagePath: resume.storagePath,
          mimeType: resume.mimeType,
          fileSizeBytes: resume.fileSizeBytes,
          uploadedAt: resume.uploadedAt,
          updatedAt: resume.updatedAt,
        }
      : null,
    initialCompletion: completion,
  };
}
