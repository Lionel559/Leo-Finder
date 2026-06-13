import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getUserProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const profileSelect =
  "id,email,full_name,headline,bio,location,timezone,avatar_url,website_url,portfolio_url,github_url,linkedin_url,preferred_roles,experience_level,onboarding_completed,created_at,updated_at";

export type UserSkillSource = "user" | "resume" | "ai" | "import";

export type UserSkill = {
  id: string;
  skillId: string;
  name: string;
  slug: string;
  category: string | null;
  proficiency: string | null;
  yearsExperience: number | null;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type UserPreferences = {
  preferredCategories: string[];
  preferredLocations: string[];
  preferredRemoteStatuses: string[];
  preferredSkills: string[];
  minimumSalaryPrizeAmount: number | null;
  notificationFrequency: string;
  telegramEnabled: boolean;
  emailEnabled: boolean;
  preferenceData: Record<string, unknown>;
};

export type UserResume = {
  id: string;
  fileName: string;
  fileUrl: string;
  storagePath: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  uploadedAt: string;
  updatedAt: string;
};

export type ProfileCompletionItemKey =
  | "name"
  | "bio"
  | "skills"
  | "resume"
  | "preferences";

export type ProfileCompletionItem = {
  key: ProfileCompletionItemKey;
  label: string;
  complete: boolean;
};

export type ProfileCompletion = {
  score: number;
  completedCount: number;
  totalCount: number;
  items: ProfileCompletionItem[];
};

type UserSkillRow = {
  id: string;
  skill_id: string | null;
  proficiency: string | null;
  years_experience: number | string | null;
  source: string;
  created_at: string;
  updated_at: string;
};

type SkillRow = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
};

type UserPreferencesRow = {
  preferred_categories: string[] | null;
  preferred_locations: string[] | null;
  preferred_remote_statuses: string[] | null;
  preferred_skills: string[] | null;
  minimum_salary_prize_amount: number | string | null;
  notification_frequency: string | null;
  telegram_enabled: boolean | null;
  email_enabled: boolean | null;
  preference_data: unknown;
};

type UserResumeRow = {
  id: string;
  file_name: string;
  file_url: string;
  storage_path: string | null;
  mime_type: string | null;
  file_size_bytes: number | string | null;
  created_at: string;
  updated_at: string;
};

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

async function getClient(supabase?: SupabaseClient) {
  return supabase ?? (await createSupabaseServerClient());
}

export async function getUserSkills(
  userId: string,
  supabase?: SupabaseClient,
  options: { source?: UserSkillSource } = {},
): Promise<UserSkill[]> {
  const client = await getClient(supabase);
  let query = client
    .from("user_skills")
    .select("id,skill_id,proficiency,years_experience,source,created_at,updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (options.source) {
    query = query.eq("source", options.source);
  }

  const { data: userSkillRows, error } = await query;

  if (error) {
    throw error;
  }

  const rows = (userSkillRows ?? []) as UserSkillRow[];
  const skillIds = rows
    .map((row) => row.skill_id)
    .filter((skillId): skillId is string => typeof skillId === "string");

  if (skillIds.length === 0) {
    return [];
  }

  const { data: skillRows, error: skillsError } = await client
    .from("skills")
    .select("id,name,slug,category")
    .in("id", skillIds);

  if (skillsError) {
    throw skillsError;
  }

  const skillById = new Map(
    ((skillRows ?? []) as SkillRow[]).map((skill) => [skill.id, skill]),
  );

  return rows.flatMap((row) => {
    const skillId = row.skill_id;
    const skill = skillId ? skillById.get(skillId) : null;

    if (!skillId || !skill) {
      return [];
    }

    return {
      id: row.id,
      skillId,
      name: skill.name,
      slug: skill.slug,
      category: skill.category,
      proficiency: row.proficiency,
      yearsExperience: toNumber(row.years_experience),
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

export async function getUserPreferences(
  userId: string,
  supabase?: SupabaseClient,
): Promise<UserPreferences> {
  const client = await getClient(supabase);
  const { data, error } = await client
    .from("user_preferences")
    .select(
      "preferred_categories,preferred_locations,preferred_remote_statuses,preferred_skills,minimum_salary_prize_amount,notification_frequency,telegram_enabled,email_enabled,preference_data",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = data as UserPreferencesRow | null;

  return {
    preferredCategories: toStringArray(row?.preferred_categories),
    preferredLocations: toStringArray(row?.preferred_locations),
    preferredRemoteStatuses: toStringArray(row?.preferred_remote_statuses),
    preferredSkills: toStringArray(row?.preferred_skills),
    minimumSalaryPrizeAmount: toNumber(row?.minimum_salary_prize_amount),
    notificationFrequency: row?.notification_frequency ?? "daily",
    telegramEnabled: Boolean(row?.telegram_enabled),
    emailEnabled: row?.email_enabled ?? true,
    preferenceData: toRecord(row?.preference_data),
  };
}

export async function getUserResume(
  userId: string,
  supabase?: SupabaseClient,
): Promise<UserResume | null> {
  const client = await getClient(supabase);
  const { data, error } = await client
    .from("resume_uploads")
    .select(
      "id,file_name,file_url,storage_path,mime_type,file_size_bytes,created_at,updated_at",
    )
    .eq("user_id", userId)
    .eq("is_current", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = data as UserResumeRow | null;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    fileName: row.file_name,
    fileUrl: row.file_url,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    fileSizeBytes: toNumber(row.file_size_bytes),
    uploadedAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProfileCompletion(
  userId: string,
  supabase?: SupabaseClient,
): Promise<ProfileCompletion> {
  const client = await getClient(supabase);
  const [profile, preferences, skills, resume] = await Promise.all([
    getUserProfile(userId, client),
    getUserPreferences(userId, client),
    getUserSkills(userId, client),
    getUserResume(userId, client),
  ]);

  const items: ProfileCompletionItem[] = [
    {
      key: "name",
      label: "Name",
      complete: hasText(profile?.full_name),
    },
    {
      key: "bio",
      label: "Bio",
      complete: hasText(profile?.bio),
    },
    {
      key: "skills",
      label: "Skills",
      complete: skills.length > 0,
    },
    {
      key: "resume",
      label: "Resume",
      complete: Boolean(resume),
    },
    {
      key: "preferences",
      label: "Preferences",
      complete:
        (profile?.preferred_roles?.length ?? 0) > 0 &&
        preferences.preferredLocations.length > 0 &&
        Boolean(profile?.experience_level),
    },
  ];
  const completedCount = items.filter((item) => item.complete).length;

  return {
    score: Math.round((completedCount / items.length) * 100),
    completedCount,
    totalCount: items.length,
    items,
  };
}
