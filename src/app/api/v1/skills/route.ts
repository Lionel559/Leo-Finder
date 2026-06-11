import { z } from "zod";

import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api";
import { AuthError, requireAuth } from "@/lib/auth";
import { getProfileCompletion, getUserSkills } from "@/lib/profile/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ValidationErrors } from "@/types";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

const skillsUpdateSchema = z
  .object({
    skills: z.array(z.string().trim().min(1).max(80)).max(50),
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

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `skill-${crypto.randomUUID()}`;
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
    const [skills, completion] = await Promise.all([
      getUserSkills(user.id, supabase, { source: "user" }),
      getProfileCompletion(user.id, supabase),
    ]);

    return successResponse(
      "Skills loaded",
      {
        skills,
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

export async function PUT(request: Request) {
  const body = await readJson(request);
  const parsed = skillsUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return validationErrorResponse(
      formatZodErrors(parsed.error),
      "Invalid skills payload",
      noStoreHeaders,
    );
  }

  const supabase = await createSupabaseServerClient();

  try {
    const user = await requireAuth(supabase);
    const admin = createSupabaseAdminClient();
    const skillNames = uniqueValues(parsed.data.skills);
    let skillRows: { id: string; name: string; slug: string }[] = [];

    if (skillNames.length > 0) {
      const { data, error } = await admin
        .from("skills")
        .upsert(
          skillNames.map((name) => ({
            name,
            slug: slugify(name),
            category: "profile",
          })),
          { onConflict: "slug" },
        )
        .select("id,name,slug");

      if (error || !data) {
        return errorResponse(
          "Skills could not be saved.",
          500,
          { code: "SKILLS_SAVE_FAILED", details: error?.message },
          noStoreHeaders,
        );
      }

      skillRows = data as { id: string; name: string; slug: string }[];
    }

    const { error: deleteError } = await admin
      .from("user_skills")
      .delete()
      .eq("user_id", user.id)
      .eq("source", "user");

    if (deleteError) {
      return errorResponse(
        "Existing skills could not be refreshed.",
        500,
        { code: "USER_SKILLS_DELETE_FAILED", details: deleteError.message },
        noStoreHeaders,
      );
    }

    if (skillRows.length > 0) {
      const { error: userSkillsError } = await admin
        .from("user_skills")
        .insert(
          skillRows.map((skill) => ({
            user_id: user.id,
            skill_id: skill.id,
            source: "user",
          })),
        );

      if (userSkillsError) {
        return errorResponse(
          "User skills could not be saved.",
          500,
          {
            code: "USER_SKILLS_SAVE_FAILED",
            details: userSkillsError.message,
          },
          noStoreHeaders,
        );
      }
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
          preferred_skills: skillNames,
          preference_data: {
            ...preferenceData,
            skills: {
              source: "settings",
              values: skillNames,
              updatedAt: new Date().toISOString(),
            },
          },
        },
        { onConflict: "user_id" },
      );

    if (preferencesError) {
      return errorResponse(
        "Skill preferences could not be updated.",
        500,
        { code: "PREFERENCES_UPDATE_FAILED", details: preferencesError.message },
        noStoreHeaders,
      );
    }

    const [skills, completion] = await Promise.all([
      getUserSkills(user.id, supabase, { source: "user" }),
      getProfileCompletion(user.id, supabase),
    ]);

    return successResponse(
      "Skills updated",
      {
        skills,
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
