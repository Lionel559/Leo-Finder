import type { SupabaseClient, User } from "@supabase/supabase-js";

import { requireCompletedOnboarding, type UserProfile } from "@/lib/auth";

import type {
  Application,
  ApplicationStatus,
  Opportunity,
  OpportunityApplicationState,
  OpportunityCategory,
  RemoteStatus,
  ResumeStatus,
} from "./types";

export const opportunitySelect =
  "id,title,organization,category,location,remote_status,deadline,source_url,apply_url,description,skills,eligibility,salary_prize_amount,status,expires_at,created_at,updated_at";

export type DbOpportunity = {
  id: string;
  title: string;
  organization: string;
  category: OpportunityCategory;
  location: string | null;
  remote_status: RemoteStatus;
  deadline: string | null;
  source_url: string;
  apply_url: string | null;
  description: string;
  skills: string[] | null;
  eligibility: unknown;
  salary_prize_amount: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type PreferenceRow = {
  preferred_categories: string[] | null;
  preferred_locations: string[] | null;
  preferred_remote_statuses: string[] | null;
  preferred_skills: string[] | null;
};

type ApplicationRow = {
  id: string;
  opportunity_id: string;
  status: ApplicationStatus;
  applied_at: string | null;
  next_step_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ResumeUploadRow = {
  file_name: string;
  file_size_bytes: number | null;
  created_at: string;
};

type ViewerPreferences = {
  preferredCategories: string[];
  preferredLocations: string[];
  preferredRemoteStatuses: string[];
  preferredSkills: string[];
};

export type OpportunityViewerContext = {
  user: User;
  profile: UserProfile;
  preferences: ViewerPreferences;
  skillNames: string[];
  savedOpportunityIds: Set<string>;
  applicationByOpportunityId: Map<string, OpportunityApplicationState>;
};

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function normalizeValues(values: string[]) {
  return values.map((value) => value.trim().toLowerCase()).filter(Boolean);
}

function hasFutureExpiry(row: DbOpportunity) {
  if (!row.expires_at) {
    return true;
  }

  return new Date(row.expires_at).getTime() > Date.now();
}

function getApplicationState(
  context: OpportunityViewerContext | null,
  opportunityId: string,
) {
  return context?.applicationByOpportunityId.get(opportunityId) ?? null;
}

function calculateMatchScore(
  row: DbOpportunity,
  context: OpportunityViewerContext | null,
) {
  if (!context) {
    return 50;
  }

  const categorySet = new Set(normalizeValues(context.preferences.preferredCategories));
  const remoteSet = new Set(normalizeValues(context.preferences.preferredRemoteStatuses));
  const preferredLocations = normalizeValues(context.preferences.preferredLocations);
  const preferredSkills = normalizeValues([
    ...context.preferences.preferredSkills,
    ...context.skillNames,
  ]);
  const opportunitySkills = normalizeValues(row.skills ?? []);
  const preferredRoles = normalizeValues(context.profile.preferred_roles ?? []);
  const title = row.title.toLowerCase();
  const location = row.location?.toLowerCase() ?? "";
  let score = 42;

  if (categorySet.has(row.category)) {
    score += 20;
  }

  if (remoteSet.has(row.remote_status)) {
    score += 10;
  }

  if (
    preferredLocations.some(
      (preferredLocation) =>
        preferredLocation === "global" ||
        preferredLocation === "remote" ||
        location.includes(preferredLocation),
    )
  ) {
    score += 10;
  }

  const matchingSkills = opportunitySkills.filter((skill) =>
    preferredSkills.includes(skill),
  );
  score += Math.min(22, matchingSkills.length * 7);

  if (
    preferredRoles.some((role) =>
      role
        .split(/\s+/)
        .filter((part) => part.length > 2)
        .some((part) => title.includes(part)),
    )
  ) {
    score += 8;
  }

  return Math.max(35, Math.min(score, 98));
}

export function formatOpportunity(
  row: DbOpportunity,
  context: OpportunityViewerContext | null = null,
): Opportunity {
  return {
    id: row.id,
    title: row.title,
    organization: row.organization,
    category: row.category,
    location: row.location,
    remoteStatus: row.remote_status,
    deadline: row.deadline,
    sourceUrl: row.source_url,
    applyUrl: row.apply_url,
    description: row.description,
    skills: row.skills ?? [],
    eligibility: row.eligibility,
    salaryPrizeAmount: row.salary_prize_amount,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    matchScore: calculateMatchScore(row, context),
    match: null,
    isSaved: context?.savedOpportunityIds.has(row.id) ?? false,
    application: getApplicationState(context, row.id),
  };
}

export function filterPublishedRows(rows: DbOpportunity[]) {
  return rows.filter((row) => row.status === "published" && hasFutureExpiry(row));
}

export function formatApplication(
  row: ApplicationRow,
  opportunity: Opportunity | null,
): Application {
  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    status: row.status,
    appliedAt: row.applied_at,
    nextStepAt: row.next_step_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    opportunity,
  };
}

export async function getOpportunityViewerContext(
  supabase: SupabaseClient,
): Promise<OpportunityViewerContext> {
  const { user, profile } = await requireCompletedOnboarding(supabase);

  const [preferencesResult, userSkillsResult, savedResult, applicationsResult] =
    await Promise.all([
      supabase
        .from("user_preferences")
        .select(
          "preferred_categories,preferred_locations,preferred_remote_statuses,preferred_skills",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("user_skills").select("skill_id").eq("user_id", user.id),
      supabase
        .from("saved_opportunities")
        .select("opportunity_id")
        .eq("user_id", user.id),
      supabase
        .from("applications")
        .select("id,opportunity_id,status,applied_at,next_step_at,notes,created_at,updated_at")
        .eq("user_id", user.id),
    ]);

  if (preferencesResult.error) {
    throw preferencesResult.error;
  }

  if (userSkillsResult.error) {
    throw userSkillsResult.error;
  }

  if (savedResult.error) {
    throw savedResult.error;
  }

  if (applicationsResult.error) {
    throw applicationsResult.error;
  }

  const skillIds = (userSkillsResult.data ?? [])
    .map((row) => row.skill_id)
    .filter((skillId): skillId is string => typeof skillId === "string");
  let skillNames: string[] = [];

  if (skillIds.length > 0) {
    const { data, error } = await supabase
      .from("skills")
      .select("id,name")
      .in("id", skillIds);

    if (error) {
      throw error;
    }

    skillNames = (data ?? [])
      .map((row) => row.name)
      .filter((name): name is string => typeof name === "string");
  }

  const preferences = preferencesResult.data as PreferenceRow | null;
  const applicationByOpportunityId = new Map<string, OpportunityApplicationState>();

  for (const application of (applicationsResult.data ?? []) as ApplicationRow[]) {
    applicationByOpportunityId.set(application.opportunity_id, {
      id: application.id,
      status: application.status,
    });
  }

  return {
    user,
    profile,
    preferences: {
      preferredCategories: toStringArray(preferences?.preferred_categories),
      preferredLocations: toStringArray(preferences?.preferred_locations),
      preferredRemoteStatuses: toStringArray(
        preferences?.preferred_remote_statuses,
      ),
      preferredSkills: toStringArray(preferences?.preferred_skills),
    },
    skillNames,
    savedOpportunityIds: new Set(
      (savedResult.data ?? [])
        .map((row) => row.opportunity_id)
        .filter((opportunityId): opportunityId is string => typeof opportunityId === "string"),
    ),
    applicationByOpportunityId,
  };
}

export async function getCurrentResumeStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<ResumeStatus> {
  const { data, error } = await supabase
    .from("resume_uploads")
    .select("file_name,file_size_bytes,created_at")
    .eq("user_id", userId)
    .eq("is_current", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const resume = data as ResumeUploadRow | null;

  return {
    uploaded: Boolean(resume),
    fileName: resume?.file_name ?? null,
    fileSizeBytes: resume?.file_size_bytes ?? null,
    uploadedAt: resume?.created_at ?? null,
  };
}

export async function getApplicationsWithOpportunities(
  supabase: SupabaseClient,
  context: OpportunityViewerContext,
) {
  const { data: applicationRows, error: applicationsError } = await supabase
    .from("applications")
    .select("id,opportunity_id,status,applied_at,next_step_at,notes,created_at,updated_at")
    .eq("user_id", context.user.id)
    .order("updated_at", { ascending: false });

  if (applicationsError) {
    throw applicationsError;
  }

  const rows = (applicationRows ?? []) as ApplicationRow[];
  const opportunityIds = [...new Set(rows.map((row) => row.opportunity_id))];
  let opportunityById = new Map<string, Opportunity>();

  if (opportunityIds.length > 0) {
    const { data, error } = await supabase
      .from("opportunities")
      .select(opportunitySelect)
      .in("id", opportunityIds);

    if (error) {
      throw error;
    }

    opportunityById = new Map(
      ((data ?? []) as DbOpportunity[]).map((row) => [
        row.id,
        formatOpportunity(row, context),
      ]),
    );
  }

  return rows.map((row) => formatApplication(row, opportunityById.get(row.opportunity_id) ?? null));
}
