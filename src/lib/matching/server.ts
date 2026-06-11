import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAIService } from "@/lib/ai";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UserProfile } from "@/lib/auth";
import type { Opportunity, OpportunityMatch } from "@/lib/opportunities";
import {
  formatOpportunity,
  opportunitySelect,
  type DbOpportunity,
  type OpportunityViewerContext,
} from "@/lib/opportunities/server";

export {
  getProfileCompletion,
  getUserPreferences,
  getUserResume,
  getUserSkills,
} from "@/lib/profile/server";

type PreferenceRow = {
  preferred_categories: string[] | null;
  preferred_locations: string[] | null;
  preferred_remote_statuses: string[] | null;
  preferred_skills: string[] | null;
};

type UserSkillRow = {
  skill_id: string | null;
};

type SkillRow = {
  id: string;
  name: string;
};

type ResumeAnalysisRow = {
  summary: string | null;
  skills: string[] | null;
  strengths: string[] | null;
  gaps: string[] | null;
  experience_years: number | string | null;
  preferred_roles: string[] | null;
  industries: string[] | null;
  seniority: string | null;
  created_at: string;
};

type SavedOpportunityRow = {
  opportunity_id: string | null;
};

type ApplicationHistoryRow = {
  opportunity_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type HistoryOpportunityRow = {
  id: string;
  title: string;
  category: string;
  location: string | null;
  remote_status: string;
  skills: string[] | null;
};

export type MatchingProfile = {
  userId: string;
  profile: UserProfile | null;
  preferences: {
    preferredCategories: string[];
    preferredLocations: string[];
    preferredRemoteStatuses: string[];
    preferredSkills: string[];
  };
  userSkills: string[];
  resumeAnalysis: ResumeAnalysisRow | null;
  savedOpportunityIds: Set<string>;
  applications: ApplicationHistoryRow[];
  historyOpportunities: HistoryOpportunityRow[];
};

export type MatchScoreResult = {
  userId: string;
  opportunityId: string;
  overallScore: number;
  skillMatchScore: number;
  preferenceMatchScore: number;
  experienceMatchScore: number;
  historyMatchScore: number;
  confidence: number;
  reasons: string[];
  missingSkills: string[];
  matchedSkills: string[];
  recommendation: string;
  aiExplanation: string | null;
  modelName: string;
};

export type MatchScoreApiResult = {
  user_id: string;
  opportunity_id: string;
  overall_score: number;
  skill_match_score: number;
  preference_match_score: number;
  experience_match_score: number;
  history_match_score: number;
  reasons: string[];
  missing_skills: string[];
  recommendation: string;
};

type ScoreOptions = {
  includeAiExplanation?: boolean;
  saveHistory?: boolean;
};

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function normalizeList(values: string[]) {
  return values.map(normalize).filter(Boolean);
}

function uniqueValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countSkillMatches(requiredSkills: string[], candidateSkills: string[]) {
  const normalizedCandidates = normalizeList(candidateSkills);
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skill of requiredSkills) {
    const normalizedSkill = normalize(skill);
    const isMatched = normalizedCandidates.some(
      (candidate) =>
        candidate === normalizedSkill ||
        candidate.includes(normalizedSkill) ||
        normalizedSkill.includes(candidate),
    );

    if (isMatched) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  return {
    matchedSkills: uniqueValues(matchedSkills),
    missingSkills: uniqueValues(missingSkills),
  };
}

function matchesLocation(location: string | null, preferredLocations: string[]) {
  const normalizedLocation = normalize(location ?? "");
  const normalizedPreferred = normalizeList(preferredLocations);

  if (normalizedPreferred.length === 0) {
    return false;
  }

  return normalizedPreferred.some(
    (preferred) =>
      preferred === "global" ||
      preferred === "remote" ||
      normalizedLocation.includes(preferred) ||
      preferred.includes(normalizedLocation),
  );
}

function getRoleTitleMatch(title: string, roles: string[]) {
  const normalizedTitle = normalize(title);

  return normalizeList(roles).some((role) =>
    role
      .split(/\s+/)
      .filter((part) => part.length > 2)
      .some((part) => normalizedTitle.includes(part)),
  );
}

function getRecommendation(overallScore: number, missingSkills: string[]) {
  if (overallScore >= 85) {
    return missingSkills.length > 0
      ? "High-priority match. Apply soon, and close the listed skill gaps before submitting."
      : "High-priority match. Your profile strongly aligns with this opportunity.";
  }

  if (overallScore >= 70) {
    return "Good match. Review the details and save it if the timeline works for you.";
  }

  if (overallScore >= 50) {
    return "Potential match. The opportunity has useful overlap, but the missing skills deserve attention.";
  }

  return "Lower-confidence match. Keep it as a learning target unless the organization or category is especially important to you.";
}

function getConfidence(profile: MatchingProfile) {
  let confidence = 45;

  if (profile.userSkills.length > 0) confidence += 18;
  if (profile.resumeAnalysis) confidence += 18;
  if (
    profile.preferences.preferredCategories.length > 0 ||
    profile.preferences.preferredRemoteStatuses.length > 0 ||
    profile.preferences.preferredLocations.length > 0
  ) {
    confidence += 14;
  }
  if (profile.savedOpportunityIds.size > 0 || profile.applications.length > 0) {
    confidence += 5;
  }

  return clampScore(confidence);
}

function scoreSkills(profile: MatchingProfile, opportunity: DbOpportunity) {
  const opportunitySkills = toStringArray(opportunity.skills);
  const candidateSkills = uniqueValues([
    ...profile.userSkills,
    ...profile.preferences.preferredSkills,
    ...toStringArray(profile.resumeAnalysis?.skills),
  ]);

  if (opportunitySkills.length === 0) {
    return {
      matchedSkills: [],
      missingSkills: [],
      score: 70,
    };
  }

  const { matchedSkills, missingSkills } = countSkillMatches(
    opportunitySkills,
    candidateSkills,
  );

  return {
    matchedSkills,
    missingSkills,
    score: clampScore((matchedSkills.length / opportunitySkills.length) * 100),
  };
}

function scorePreferences(
  profile: MatchingProfile,
  opportunity: DbOpportunity,
  matchedSkills: string[],
) {
  const points = {
    earned: 0,
    possible: 0,
  };

  if (profile.preferences.preferredCategories.length > 0) {
    points.possible += 30;
    points.earned += profile.preferences.preferredCategories
      .map(normalize)
      .includes(opportunity.category)
      ? 30
      : 5;
  }

  if (profile.preferences.preferredRemoteStatuses.length > 0) {
    points.possible += 25;
    points.earned += profile.preferences.preferredRemoteStatuses
      .map(normalize)
      .includes(opportunity.remote_status)
      ? 25
      : 6;
  }

  if (profile.preferences.preferredLocations.length > 0) {
    points.possible += 25;
    points.earned += matchesLocation(
      opportunity.location,
      profile.preferences.preferredLocations,
    )
      ? 25
      : 6;
  }

  if (profile.preferences.preferredSkills.length > 0) {
    points.possible += 20;
    const { matchedSkills: preferredSkillMatches } = countSkillMatches(
      profile.preferences.preferredSkills,
      matchedSkills,
    );
    points.earned +=
      (preferredSkillMatches.length /
        profile.preferences.preferredSkills.length) *
      20;
  }

  if (points.possible === 0) {
    return 60;
  }

  return clampScore((points.earned / points.possible) * 100);
}

function scoreExperience(profile: MatchingProfile, opportunity: DbOpportunity) {
  const resume = profile.resumeAnalysis;
  const profileRoles = profile.profile?.preferred_roles ?? [];
  const resumeRoles = toStringArray(resume?.preferred_roles);
  const roleMatch = getRoleTitleMatch(opportunity.title, [
    ...profileRoles,
    ...resumeRoles,
  ]);
  const opportunitySkills = toStringArray(opportunity.skills);

  if (!resume) {
    const { matchedSkills } = countSkillMatches(
      opportunitySkills,
      profile.userSkills,
    );

    return clampScore(
      35 +
        (opportunitySkills.length > 0
          ? (matchedSkills.length / opportunitySkills.length) * 40
          : 15) +
        (roleMatch ? 20 : 0) +
        (profile.profile?.experience_level ? 5 : 0),
    );
  }

  const resumeSkills = toStringArray(resume.skills);
  const { matchedSkills } = countSkillMatches(opportunitySkills, resumeSkills);
  const resumeSkillScore =
    opportunitySkills.length > 0
      ? (matchedSkills.length / opportunitySkills.length) * 55
      : 25;
  const years = Number(resume.experience_years ?? 0);
  const experiencePoints = Number.isFinite(years)
    ? Math.min(20, Math.max(8, years * 4))
    : 10;
  const seniorityPoints = resume.seniority ? 5 : 0;

  return clampScore(
    resumeSkillScore + (roleMatch ? 25 : 8) + experiencePoints + seniorityPoints,
  );
}

function scoreHistory(profile: MatchingProfile, opportunity: DbOpportunity) {
  let score = profile.applications.length > 0 || profile.savedOpportunityIds.size > 0
    ? 50
    : 60;
  const sameApplication = profile.applications.find(
    (application) => application.opportunity_id === opportunity.id,
  );

  if (profile.savedOpportunityIds.has(opportunity.id)) {
    score += 20;
  }

  if (sameApplication) {
    if (sameApplication.status === "rejected") {
      score -= 30;
    } else if (
      ["interviewing", "offer_received", "completed"].includes(
        sameApplication.status,
      )
    ) {
      score += 20;
    } else {
      score += 10;
    }
  }

  const similarCategoryCount = profile.historyOpportunities.filter(
    (historyOpportunity) =>
      historyOpportunity.id !== opportunity.id &&
      historyOpportunity.category === opportunity.category,
  ).length;
  const historicalSkills = uniqueValues(
    profile.historyOpportunities.flatMap((historyOpportunity) =>
      toStringArray(historyOpportunity.skills),
    ),
  );
  const { matchedSkills } = countSkillMatches(
    toStringArray(opportunity.skills),
    historicalSkills,
  );

  score += Math.min(15, similarCategoryCount * 5);
  score += Math.min(15, matchedSkills.length * 4);

  return clampScore(score);
}

function buildReasons({
  historyScore,
  matchedSkills,
  opportunity,
  preferenceScore,
  profile,
  resumeScore,
}: {
  historyScore: number;
  matchedSkills: string[];
  opportunity: DbOpportunity;
  preferenceScore: number;
  profile: MatchingProfile;
  resumeScore: number;
}) {
  const reasons: string[] = [];

  if (matchedSkills.length > 0) {
    reasons.push(
      `You match ${matchedSkills.slice(0, 4).join(", ")} from the required skill set.`,
    );
  }

  if (
    profile.preferences.preferredCategories.map(normalize).includes(
      opportunity.category,
    )
  ) {
    reasons.push("The category matches your opportunity preferences.");
  }

  if (
    profile.preferences.preferredRemoteStatuses.map(normalize).includes(
      opportunity.remote_status,
    )
  ) {
    reasons.push("The remote setup matches your preferred work mode.");
  }

  if (matchesLocation(opportunity.location, profile.preferences.preferredLocations)) {
    reasons.push("The location aligns with your preferred locations.");
  }

  if (resumeScore >= 70) {
    reasons.push("Your latest resume analysis supports this match.");
  }

  if (historyScore >= 70) {
    reasons.push("Your saved or application history points toward similar opportunities.");
  }

  if (preferenceScore < 45) {
    reasons.push("Some preferences do not line up, so review the details before applying.");
  }

  if (reasons.length === 0) {
    reasons.push("There is baseline overlap with your profile, but more profile data would improve confidence.");
  }

  return reasons.slice(0, 6);
}

async function maybeGenerateAIExplanation({
  match,
  opportunity,
}: {
  match: Omit<MatchScoreResult, "aiExplanation" | "modelName">;
  opportunity: DbOpportunity;
}) {
  const apiKey = process.env.QWEN_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  try {
    const ai = createAIService("qwen");
    const response = await ai.generateMatchExplanation({
      opportunity: {
        title: opportunity.title,
        organization: opportunity.organization,
        category: opportunity.category,
        skills: toStringArray(opportunity.skills),
      },
      match: {
        overallScore: match.overallScore,
        reasons: match.reasons,
        missingSkills: match.missingSkills,
      },
    });

    return response.text.trim() || null;
  } catch (error) {
    console.warn("[matching] Qwen explanation skipped", {
      error: error instanceof Error ? error.message : String(error),
      opportunityId: opportunity.id,
    });

    return null;
  }
}

export async function loadMatchingProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<MatchingProfile> {
  const [
    profileResult,
    preferencesResult,
    userSkillsResult,
    resumeAnalysisResult,
    savedResult,
    applicationsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,email,full_name,headline,bio,location,timezone,avatar_url,website_url,portfolio_url,github_url,linkedin_url,preferred_roles,experience_level,onboarding_completed,created_at,updated_at",
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("user_preferences")
      .select(
        "preferred_categories,preferred_locations,preferred_remote_statuses,preferred_skills",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("user_skills").select("skill_id").eq("user_id", userId),
    supabase
      .from("resume_analyses")
      .select(
        "summary,skills,strengths,gaps,experience_years,preferred_roles,industries,seniority,created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("saved_opportunities")
      .select("opportunity_id")
      .eq("user_id", userId),
    supabase
      .from("applications")
      .select("opportunity_id,status,created_at,updated_at")
      .eq("user_id", userId),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (preferencesResult.error) throw preferencesResult.error;
  if (userSkillsResult.error) throw userSkillsResult.error;
  if (resumeAnalysisResult.error) throw resumeAnalysisResult.error;
  if (savedResult.error) throw savedResult.error;
  if (applicationsResult.error) throw applicationsResult.error;

  const userSkillRows = (userSkillsResult.data ?? []) as UserSkillRow[];
  const skillIds = userSkillRows
    .map((row) => row.skill_id)
    .filter((skillId): skillId is string => typeof skillId === "string");
  let userSkills: string[] = [];

  if (skillIds.length > 0) {
    const { data, error } = await supabase
      .from("skills")
      .select("id,name")
      .in("id", skillIds);

    if (error) throw error;

    userSkills = ((data ?? []) as SkillRow[]).map((row) => row.name);
  }

  const savedRows = (savedResult.data ?? []) as SavedOpportunityRow[];
  const applicationRows = (applicationsResult.data ?? []) as ApplicationHistoryRow[];
  const historyOpportunityIds = uniqueValues([
    ...savedRows
      .map((row) => row.opportunity_id)
      .filter((opportunityId): opportunityId is string => typeof opportunityId === "string"),
    ...applicationRows.map((row) => row.opportunity_id),
  ]);
  let historyOpportunities: HistoryOpportunityRow[] = [];

  if (historyOpportunityIds.length > 0) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id,title,category,location,remote_status,skills")
      .in("id", historyOpportunityIds);

    if (error) throw error;

    historyOpportunities = (data ?? []) as HistoryOpportunityRow[];
  }

  const preferences = preferencesResult.data as PreferenceRow | null;

  return {
    userId,
    profile: profileResult.data as UserProfile | null,
    preferences: {
      preferredCategories: toStringArray(preferences?.preferred_categories),
      preferredLocations: toStringArray(preferences?.preferred_locations),
      preferredRemoteStatuses: toStringArray(
        preferences?.preferred_remote_statuses,
      ),
      preferredSkills: toStringArray(preferences?.preferred_skills),
    },
    userSkills,
    resumeAnalysis: resumeAnalysisResult.data as ResumeAnalysisRow | null,
    savedOpportunityIds: new Set(
      savedRows
        .map((row) => row.opportunity_id)
        .filter((opportunityId): opportunityId is string => typeof opportunityId === "string"),
    ),
    applications: applicationRows,
    historyOpportunities,
  };
}

export async function loadOpportunityForMatching(
  supabase: SupabaseClient,
  opportunityId: string,
) {
  const { data, error } = await supabase
    .from("opportunities")
    .select(opportunitySelect)
    .eq("id", opportunityId)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as DbOpportunity | null;
}

export async function saveMatchScoreResult(result: MatchScoreResult) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("recommendation_history").insert({
    user_id: result.userId,
    opportunity_id: result.opportunityId,
    score: result.overallScore,
    confidence: result.confidence,
    reasons: result.reasons,
    missing_requirements: result.missingSkills,
    model_name: result.modelName,
    context: {
      ai_explanation: result.aiExplanation,
      history_match_score: result.historyMatchScore,
      matched_skills: result.matchedSkills,
      preference_match_score: result.preferenceMatchScore,
      recommendation: result.recommendation,
      skill_match_score: result.skillMatchScore,
      experience_match_score: result.experienceMatchScore,
      source: "rule_based_v1",
    },
  });

  if (error) {
    throw error;
  }
}

export async function scoreOpportunityMatch(
  profile: MatchingProfile,
  opportunity: DbOpportunity,
  options: ScoreOptions = {},
): Promise<MatchScoreResult> {
  const { matchedSkills, missingSkills, score: skillMatchScore } = scoreSkills(
    profile,
    opportunity,
  );
  const preferenceMatchScore = scorePreferences(
    profile,
    opportunity,
    matchedSkills,
  );
  const experienceMatchScore = scoreExperience(profile, opportunity);
  const historyMatchScore = scoreHistory(profile, opportunity);
  const overallScore = clampScore(
    skillMatchScore * 0.4 +
      preferenceMatchScore * 0.25 +
      experienceMatchScore * 0.2 +
      historyMatchScore * 0.15,
  );
  const recommendation = getRecommendation(overallScore, missingSkills);
  const baseMatch = {
    userId: profile.userId,
    opportunityId: opportunity.id,
    overallScore,
    skillMatchScore,
    preferenceMatchScore,
    experienceMatchScore,
    historyMatchScore,
    confidence: getConfidence(profile),
    reasons: buildReasons({
      historyScore: historyMatchScore,
      matchedSkills,
      opportunity,
      preferenceScore: preferenceMatchScore,
      profile,
      resumeScore: experienceMatchScore,
    }),
    missingSkills,
    matchedSkills,
    recommendation,
  };
  const aiExplanation = options.includeAiExplanation
    ? await maybeGenerateAIExplanation({ match: baseMatch, opportunity })
    : null;
  const result: MatchScoreResult = {
    ...baseMatch,
    aiExplanation,
    modelName: aiExplanation ? "qwen" : "rule_based_v1",
  };

  if (options.saveHistory) {
    await saveMatchScoreResult(result);
  }

  return result;
}

export function toMatchScoreApiResult(
  result: MatchScoreResult,
): MatchScoreApiResult {
  return {
    user_id: result.userId,
    opportunity_id: result.opportunityId,
    overall_score: result.overallScore,
    skill_match_score: result.skillMatchScore,
    preference_match_score: result.preferenceMatchScore,
    experience_match_score: result.experienceMatchScore,
    history_match_score: result.historyMatchScore,
    reasons: result.reasons,
    missing_skills: result.missingSkills,
    recommendation: result.recommendation,
  };
}

export function toOpportunityMatch(result: MatchScoreResult): OpportunityMatch {
  return {
    overallScore: result.overallScore,
    skillMatchScore: result.skillMatchScore,
    preferenceMatchScore: result.preferenceMatchScore,
    experienceMatchScore: result.experienceMatchScore,
    historyMatchScore: result.historyMatchScore,
    reasons: result.reasons,
    missingSkills: result.missingSkills,
    recommendation: result.recommendation,
  };
}

export function applyMatchToOpportunity(
  opportunity: Opportunity,
  result: MatchScoreResult,
): Opportunity {
  return {
    ...opportunity,
    match: toOpportunityMatch(result),
    matchScore: result.overallScore,
  };
}

export async function buildMatchedOpportunity({
  matchOptions,
  opportunity,
  profile,
  viewerContext,
}: {
  matchOptions?: ScoreOptions;
  opportunity: DbOpportunity;
  profile: MatchingProfile;
  viewerContext: OpportunityViewerContext;
}) {
  const formattedOpportunity = formatOpportunity(opportunity, viewerContext);
  const match = await scoreOpportunityMatch(profile, opportunity, matchOptions);

  return applyMatchToOpportunity(formattedOpportunity, match);
}
