import { z } from "zod";

import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api";
import { AuthError, requireAuth } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ValidationErrors } from "@/types";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

const textArraySchema = z
  .array(z.string().trim().min(1).max(80))
  .min(1)
  .max(20);

const onboardingSchema = z
  .object({
    preferredRoles: textArraySchema,
    experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
    preferredLocations: textArraySchema,
    remotePreference: z.enum(["remote", "hybrid", "onsite", "unknown"]),
    skills: textArraySchema,
    preferredOpportunityTypes: z
      .array(
        z.enum([
          "job",
          "internship",
          "bounty",
          "grant",
          "scholarship",
          "fellowship",
          "startup_program",
          "hackathon",
        ]),
      )
      .min(1)
      .max(8),
  })
  .strict();

const allowedResumeMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const maxResumeSizeBytes = 10 * 1024 * 1024;
const resumeBucketName = "resumes";

type ResumeUploadRequestLog = {
  bucketName: string;
  contentType: string;
  fileName: string;
  fileSizeBytes: number;
  storagePath: string;
  upsert: boolean;
  userId: string;
};

type SupabaseStorageError = {
  error?: string;
  message: string;
  name?: string;
  status?: number;
  statusCode?: string | number;
};

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

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function isSupportedResume(file: File) {
  const lowerName = file.name.toLowerCase();

  return (
    allowedResumeMimeTypes.has(file.type) ||
    lowerName.endsWith(".pdf") ||
    lowerName.endsWith(".docx")
  );
}

function formatStorageError(error: SupabaseStorageError) {
  return {
    error: error.error ?? null,
    message: error.message,
    name: error.name ?? null,
    status: error.status ?? null,
    statusCode: error.statusCode ?? null,
  };
}

function logResumeUploadRequest(uploadRequest: ResumeUploadRequestLog) {
  console.info("[onboarding] resume upload request", {
    bucketName: uploadRequest.bucketName,
    uploadRequest,
  });
}

function logResumeUploadResponse({
  data,
  uploadRequest,
}: {
  data: unknown;
  uploadRequest: ResumeUploadRequestLog;
}) {
  console.info("[onboarding] resume upload response", {
    bucketName: uploadRequest.bucketName,
    response: data,
    uploadRequest,
  });
}

function logResumeUploadError({
  error,
  uploadRequest,
}: {
  error: SupabaseStorageError;
  uploadRequest: ResumeUploadRequestLog;
}) {
  console.error("[onboarding] resume upload storage error", {
    bucketName: uploadRequest.bucketName,
    error: formatStorageError(error),
    uploadRequest,
  });
}

async function getOnboardingPayload(formData: FormData) {
  const rawPayload = formData.get("payload");

  if (typeof rawPayload !== "string") {
    return {
      parsed: null,
      errors: {
        payload: ["Onboarding payload is required."],
      },
    };
  }

  try {
    const payload = JSON.parse(rawPayload) as unknown;
    const parsed = onboardingSchema.safeParse(payload);

    if (!parsed.success) {
      return {
        parsed: null,
        errors: formatZodErrors(parsed.error),
      };
    }

    return {
      parsed: parsed.data,
      errors: null,
    };
  } catch {
    return {
      parsed: null,
      errors: {
        payload: ["Onboarding payload must be valid JSON."],
      },
    };
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const user = await requireAuth(supabase);
    const formData = await request.formData();
    const { parsed, errors } = await getOnboardingPayload(formData);
    const resume = formData.get("resume");

    if (!parsed || errors) {
      return validationErrorResponse(
        errors ?? { payload: ["Invalid onboarding payload."] },
        "Invalid onboarding payload",
        noStoreHeaders,
      );
    }

    if (!(resume instanceof File) || resume.size === 0) {
      return validationErrorResponse(
        { resume: ["A PDF or DOCX resume is required."] },
        "Invalid resume upload",
        noStoreHeaders,
      );
    }

    if (!isSupportedResume(resume)) {
      return validationErrorResponse(
        { resume: ["Resume must be a PDF or DOCX file."] },
        "Invalid resume upload",
        noStoreHeaders,
      );
    }

    if (resume.size > maxResumeSizeBytes) {
      return validationErrorResponse(
        { resume: ["Resume must be 10MB or smaller."] },
        "Invalid resume upload",
        noStoreHeaders,
      );
    }

    const admin = createSupabaseAdminClient();
    const preferredRoles = uniqueValues(parsed.preferredRoles);
    const preferredLocations = uniqueValues(parsed.preferredLocations);
    const skillNames = uniqueValues(parsed.skills);
    const preferredOpportunityTypes = [...new Set(parsed.preferredOpportunityTypes)];
    const sanitizedFileName = sanitizeFileName(resume.name) || "resume";
    const storagePath = `${user.id}/${crypto.randomUUID()}-${sanitizedFileName}`;
    const contentType = resume.type || "application/octet-stream";
    const fileUrl = `storage://${resumeBucketName}/${storagePath}`;
    const uploadRequest = {
      bucketName: resumeBucketName,
      contentType,
      fileName: resume.name,
      fileSizeBytes: resume.size,
      storagePath,
      upsert: false,
      userId: user.id,
    };

    logResumeUploadRequest(uploadRequest);

    const { data: uploadData, error: uploadError } = await admin.storage
      .from(resumeBucketName)
      .upload(storagePath, resume, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      logResumeUploadError({
        error: uploadError,
        uploadRequest,
      });

      return errorResponse(
        uploadError.message,
        500,
        {
          code: "RESUME_UPLOAD_FAILED",
          details: {
            bucketName: resumeBucketName,
            storageError: formatStorageError(uploadError),
            uploadRequest,
          },
        },
        noStoreHeaders,
      );
    }

    logResumeUploadResponse({
      data: uploadData,
      uploadRequest,
    });

    await admin
      .from("resume_uploads")
      .update({ is_current: false })
      .eq("user_id", user.id)
      .eq("is_current", true);

    const { data: resumeUpload, error: resumeUploadError } = await admin
      .from("resume_uploads")
      .insert({
        user_id: user.id,
        file_name: resume.name,
        file_url: fileUrl,
        storage_path: storagePath,
        mime_type: contentType,
        file_size_bytes: resume.size,
        is_current: true,
      })
      .select("id,file_name,storage_path,mime_type,file_size_bytes,created_at")
      .single();

    if (resumeUploadError) {
      return errorResponse(
        "Resume metadata could not be saved.",
        500,
        { code: "RESUME_METADATA_FAILED", details: resumeUploadError.message },
        noStoreHeaders,
      );
    }

    const skillRecords = skillNames.map((name) => ({
      name,
      slug: slugify(name),
      category: "onboarding",
    }));

    const { data: skills, error: skillsError } = await admin
      .from("skills")
      .upsert(skillRecords, { onConflict: "slug" })
      .select("id,name,slug");

    if (skillsError || !skills) {
      return errorResponse(
        "Skills could not be saved.",
        500,
        { code: "SKILLS_SAVE_FAILED", details: skillsError?.message },
        noStoreHeaders,
      );
    }

    const { error: deleteSkillsError } = await admin
      .from("user_skills")
      .delete()
      .eq("user_id", user.id)
      .eq("source", "user");

    if (deleteSkillsError) {
      return errorResponse(
        "Existing skills could not be refreshed.",
        500,
        { code: "USER_SKILLS_DELETE_FAILED", details: deleteSkillsError.message },
        noStoreHeaders,
      );
    }

    const userSkillRows = skills.map((skill) => ({
      user_id: user.id,
      skill_id: skill.id,
      source: "user",
    }));

    const { error: userSkillsError } = await admin
      .from("user_skills")
      .insert(userSkillRows);

    if (userSkillsError) {
      return errorResponse(
        "User skills could not be saved.",
        500,
        { code: "USER_SKILLS_SAVE_FAILED", details: userSkillsError.message },
        noStoreHeaders,
      );
    }

    const { data: existingPreferences } = await admin
      .from("user_preferences")
      .select("preference_data")
      .eq("user_id", user.id)
      .maybeSingle();
    const existingPreferenceData =
      existingPreferences?.preference_data &&
      typeof existingPreferences.preference_data === "object" &&
      !Array.isArray(existingPreferences.preference_data)
        ? existingPreferences.preference_data
        : {};

    const { error: preferencesError } = await admin
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          preferred_categories: preferredOpportunityTypes,
          preferred_locations: preferredLocations,
          preferred_remote_statuses: [parsed.remotePreference],
          preferred_skills: skillNames,
          preference_data: {
            ...existingPreferenceData,
            onboarding: {
              preferredRoles,
              experienceLevel: parsed.experienceLevel,
              preferredLocations,
              remotePreference: parsed.remotePreference,
              skills: skillNames,
              preferredOpportunityTypes,
              resume: {
                uploadId: resumeUpload.id,
                fileUrl,
                fileName: resume.name,
                fileSize: resume.size,
              },
              completedAt: new Date().toISOString(),
            },
          },
        },
        { onConflict: "user_id" },
      );

    if (preferencesError) {
      return errorResponse(
        "Preferences could not be saved.",
        500,
        { code: "PREFERENCES_SAVE_FAILED", details: preferencesError.message },
        noStoreHeaders,
      );
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          preferred_roles: preferredRoles,
          experience_level: parsed.experienceLevel,
          location: preferredLocations[0] ?? null,
        },
        { onConflict: "id" },
      )
      .select(
        "id,email,full_name,preferred_roles,experience_level,location,onboarding_completed,updated_at",
      )
      .single();

    if (profileError) {
      return errorResponse(
        "Profile onboarding could not be completed.",
        500,
        { code: "PROFILE_ONBOARDING_FAILED", details: profileError.message },
        noStoreHeaders,
      );
    }

    return successResponse(
      "Core onboarding saved",
      {
        profile,
        skills,
        resumeUpload: {
          ...resumeUpload,
          file_url: fileUrl,
          file_size: resume.size,
        },
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
