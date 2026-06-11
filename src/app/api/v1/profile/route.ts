import { z } from "zod";

import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api";
import { AuthError, getUserProfile, requireAuth } from "@/lib/auth";
import {
  getProfileCompletion,
  getUserPreferences,
} from "@/lib/profile/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ValidationErrors } from "@/types";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

const textArraySchema = z
  .array(z.string().trim().min(1).max(80))
  .max(20);
const optionalUrlSchema = z
  .preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().url().max(2048).nullable().optional(),
  )
  .transform((value) => value ?? null);

const profileUpdateSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120),
    bio: z.string().trim().max(1000).optional().default(""),
    experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
    preferredRoles: textArraySchema,
    preferredLocations: textArraySchema,
    portfolioUrl: optionalUrlSchema,
    githubUrl: optionalUrlSchema,
    linkedinUrl: optionalUrlSchema,
  })
  .strict();

function formatZodErrors(error: z.ZodError): ValidationErrors {
  return error.flatten().fieldErrors as ValidationErrors;
}

function uniqueValues(values: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const normalized = value.trim().replace(/\s+/g, " ");
    const key = normalized.toLowerCase();

    if (normalized && !seen.has(key)) {
      seen.add(key);
      unique.push(normalized);
    }
  }

  return unique;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET() {
  const supabase = await createSupabaseServerClient();

  try {
    const user = await requireAuth(supabase);
    const [profile, preferences, completion] = await Promise.all([
      getUserProfile(user.id, supabase),
      getUserPreferences(user.id, supabase),
      getProfileCompletion(user.id, supabase),
    ]);

    return successResponse(
      "Profile loaded",
      {
        profile,
        preferences,
        completion,
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return errorResponse(
        error.message,
        error.status,
        { code: error.code },
        noStoreHeaders,
      );
    }

    throw error;
  }
}

export async function PATCH(request: Request) {
  const body = await readJson(request);
  const parsed = profileUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return validationErrorResponse(
      formatZodErrors(parsed.error),
      "Invalid profile payload",
      noStoreHeaders,
    );
  }

  const supabase = await createSupabaseServerClient();

  try {
    const user = await requireAuth(supabase);
    const admin = createSupabaseAdminClient();
    const preferredRoles = uniqueValues(parsed.data.preferredRoles);
    const preferredLocations = uniqueValues(parsed.data.preferredLocations);
    const portfolioUrl = parsed.data.portfolioUrl;

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          full_name: parsed.data.fullName,
          bio: parsed.data.bio || null,
          experience_level: parsed.data.experienceLevel,
          preferred_roles: preferredRoles,
          location: preferredLocations[0] ?? null,
          website_url: portfolioUrl,
          portfolio_url: portfolioUrl,
          github_url: parsed.data.githubUrl,
          linkedin_url: parsed.data.linkedinUrl,
        },
        { onConflict: "id" },
      )
      .select(
        "id,email,full_name,headline,bio,location,timezone,avatar_url,website_url,portfolio_url,github_url,linkedin_url,preferred_roles,experience_level,onboarding_completed,created_at,updated_at",
      )
      .single();

    if (profileError) {
      return errorResponse(
        "Profile could not be updated.",
        500,
        { code: "PROFILE_UPDATE_FAILED", details: profileError.message },
        noStoreHeaders,
      );
    }

    const { data: existingPreferences, error: existingPreferencesError } =
      await admin
        .from("user_preferences")
        .select("preference_data")
        .eq("user_id", user.id)
        .maybeSingle();

    if (existingPreferencesError) {
      return errorResponse(
        "Existing preferences could not be loaded.",
        500,
        {
          code: "PREFERENCES_LOAD_FAILED",
          details: existingPreferencesError.message,
        },
        noStoreHeaders,
      );
    }

    const preferenceData = toRecord(existingPreferences?.preference_data);
    const { error: preferencesError } = await admin
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          preferred_locations: preferredLocations,
          preference_data: {
            ...preferenceData,
            profile: {
              ...(toRecord(preferenceData.profile)),
              experienceLevel: parsed.data.experienceLevel,
              preferredRoles,
              preferredLocations,
              socialLinks: {
                portfolioUrl,
                githubUrl: parsed.data.githubUrl,
                linkedinUrl: parsed.data.linkedinUrl,
              },
              updatedAt: new Date().toISOString(),
            },
          },
        },
        { onConflict: "user_id" },
      );

    if (preferencesError) {
      return errorResponse(
        "Preferences could not be updated.",
        500,
        { code: "PREFERENCES_UPDATE_FAILED", details: preferencesError.message },
        noStoreHeaders,
      );
    }

    const [preferences, completion] = await Promise.all([
      getUserPreferences(user.id, supabase),
      getProfileCompletion(user.id, supabase),
    ]);

    return successResponse(
      "Profile updated",
      {
        profile,
        preferences,
        completion,
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return errorResponse(
        error.message,
        error.status,
        { code: error.code },
        noStoreHeaders,
      );
    }

    throw error;
  }
}
