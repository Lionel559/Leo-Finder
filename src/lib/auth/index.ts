import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  timezone: string | null;
  avatar_url: string | null;
  website_url: string | null;
  portfolio_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  preferred_roles: string[];
  experience_level: "beginner" | "intermediate" | "advanced" | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "editor" | "support";
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CoreOnboardingStatus = {
  completed: boolean;
  profile: UserProfile | null;
  preferences: {
    preferredCategories: string[];
    preferredLocations: string[];
    preferredRemoteStatuses: string[];
    preferredSkills: string[];
  };
  resumeUpload: {
    fileName: string | null;
    fileSizeBytes: number | null;
  } | null;
};

const profileSelect =
  "id,email,full_name,headline,bio,location,timezone,avatar_url,website_url,portfolio_url,github_url,linkedin_url,preferred_roles,experience_level,onboarding_completed,created_at,updated_at";
const profileSelectWithoutSocialLinks =
  "id,email,full_name,headline,bio,location,timezone,avatar_url,website_url,preferred_roles,experience_level,onboarding_completed,created_at,updated_at";

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status = 401,
    readonly code = "UNAUTHORIZED",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function getCurrentUser(
  supabase?: SupabaseClient,
): Promise<User | null> {
  const client = supabase ?? (await createSupabaseServerClient());
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

function isMissingOptionalSocialProfileColumn(error: { code?: string; message: string }) {
  return (
    error.code === "42703" &&
    ["portfolio_url", "github_url", "linkedin_url"].some((column) =>
      error.message.includes(column),
    )
  );
}

function normalizeProfile(data: unknown): UserProfile | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  return {
    portfolio_url: null,
    github_url: null,
    linkedin_url: null,
    ...(data as Record<string, unknown>),
  } as UserProfile;
}

async function selectUserProfile(
  client: SupabaseClient,
  userId: string,
): Promise<UserProfile | null> {
  const { data, error } = await client
    .from("profiles")
    .select(profileSelect)
    .eq("id", userId)
    .maybeSingle();

  if (!error) {
    return normalizeProfile(data);
  }

  if (!isMissingOptionalSocialProfileColumn(error)) {
    throw error;
  }

  const fallbackResult = await client
    .from("profiles")
    .select(profileSelectWithoutSocialLinks)
    .eq("id", userId)
    .maybeSingle();

  if (fallbackResult.error) {
    throw fallbackResult.error;
  }

  return normalizeProfile(fallbackResult.data);
}

export async function getUserProfile(
  userId: string,
  supabase?: SupabaseClient,
): Promise<UserProfile | null> {
  const client = supabase ?? (await createSupabaseServerClient());
  return selectUserProfile(client, userId);
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function getCoreOnboardingStatus(
  userId: string,
  supabase?: SupabaseClient,
): Promise<CoreOnboardingStatus> {
  const client = supabase ?? (await createSupabaseServerClient());
  const [
    profile,
    preferencesResult,
    resumeResult,
    userSkillsResult,
  ] = await Promise.all([
    selectUserProfile(client, userId),
    client
      .from("user_preferences")
      .select(
        "preferred_categories,preferred_locations,preferred_remote_statuses,preferred_skills",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    client
      .from("resume_uploads")
      .select("file_name,file_size_bytes")
      .eq("user_id", userId)
      .eq("is_current", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("user_skills")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  if (preferencesResult.error) {
    throw preferencesResult.error;
  }

  if (resumeResult.error) {
    throw resumeResult.error;
  }

  if (userSkillsResult.error) {
    throw userSkillsResult.error;
  }

  const preferencesRow = preferencesResult.data;
  const preferences = {
    preferredCategories: toStringArray(preferencesRow?.preferred_categories),
    preferredLocations: toStringArray(preferencesRow?.preferred_locations),
    preferredRemoteStatuses: toStringArray(
      preferencesRow?.preferred_remote_statuses,
    ),
    preferredSkills: toStringArray(preferencesRow?.preferred_skills),
  };
  const resumeUpload = resumeResult.data
    ? {
        fileName:
          typeof resumeResult.data.file_name === "string"
            ? resumeResult.data.file_name
            : null,
        fileSizeBytes:
          typeof resumeResult.data.file_size_bytes === "number"
            ? resumeResult.data.file_size_bytes
            : typeof resumeResult.data.file_size_bytes === "string"
              ? Number(resumeResult.data.file_size_bytes)
              : null,
      }
    : null;
  const completed =
    Boolean(profile) &&
    (profile?.preferred_roles?.length ?? 0) > 0 &&
    Boolean(profile?.experience_level) &&
    Boolean(profile?.location) &&
    preferences.preferredCategories.length > 0 &&
    preferences.preferredLocations.length > 0 &&
    preferences.preferredRemoteStatuses.length > 0 &&
    preferences.preferredSkills.length > 0 &&
    Boolean(resumeUpload) &&
    (userSkillsResult.count ?? 0) > 0;

  return {
    completed,
    profile,
    preferences,
    resumeUpload,
  };
}

export async function requireAuth(supabase?: SupabaseClient): Promise<User> {
  const user = await getCurrentUser(supabase);

  if (!user) {
    throw new AuthError("Authentication required.");
  }

  return user;
}

export async function requireCompletedOnboarding(supabase?: SupabaseClient) {
  const client = supabase ?? (await createSupabaseServerClient());
  const user = await requireAuth(client);
  const coreOnboarding = await getCoreOnboardingStatus(user.id, client);
  const profile = coreOnboarding.profile;

  if (!profile || (!profile.onboarding_completed && !coreOnboarding.completed)) {
    throw new AuthError(
      "Complete onboarding before accessing this feature.",
      403,
      "ONBOARDING_REQUIRED",
    );
  }

  return {
    coreOnboarding,
    user,
    profile,
  };
}

export async function requireAdmin(supabase?: SupabaseClient) {
  const client = supabase ?? (await createSupabaseServerClient());
  const user = await requireAuth(client);
  const { data, error } = await client
    .from("admin_users")
    .select("id,user_id,role,permissions,is_active,created_at,updated_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new AuthError("Admin access required.", 403, "FORBIDDEN");
  }

  return {
    user,
    admin: data as AdminUser,
  };
}
