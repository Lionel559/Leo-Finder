import {
  errorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api";
import { AuthError, requireAuth } from "@/lib/auth";
import { getProfileCompletion, getUserResume } from "@/lib/profile/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};
const resumeBucketName = "resumes";
const maxResumeSizeBytes = 10 * 1024 * 1024;
const allowedResumeMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

type ResumeRow = {
  id: string;
  file_name: string;
  file_url: string;
  storage_path: string | null;
  mime_type: string | null;
  file_size_bytes: number | string | null;
  created_at: string;
  updated_at: string;
};

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

async function getSignedResumeUrl(storagePath: string | null) {
  if (!storagePath) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(resumeBucketName)
    .createSignedUrl(storagePath, 60 * 60);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

async function formatResume(row: ResumeRow | null) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    fileName: row.file_name,
    fileUrl: row.file_url,
    signedUrl: await getSignedResumeUrl(row.storage_path),
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    fileSizeBytes: toNumber(row.file_size_bytes),
    uploadedAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCurrentResumeRow(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
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

  return data as ResumeRow | null;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();

  try {
    const user = await requireAuth(supabase);
    const [resume, completion] = await Promise.all([
      getCurrentResumeRow(user.id).then(formatResume),
      getProfileCompletion(user.id, supabase),
    ]);

    return successResponse(
      "Resume loaded",
      {
        resume,
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

    return errorResponse(
      error instanceof Error ? error.message : "Resume could not be loaded.",
      500,
      { code: "RESUME_LOAD_FAILED" },
      noStoreHeaders,
    );
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const user = await requireAuth(supabase);
    const formData = await request.formData();
    const resume = formData.get("resume");

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
    const sanitizedFileName = sanitizeFileName(resume.name) || "resume";
    const storagePath = `${user.id}/${crypto.randomUUID()}-${sanitizedFileName}`;
    const contentType = resume.type || "application/octet-stream";
    const fileUrl = `storage://${resumeBucketName}/${storagePath}`;
    const { error: uploadError } = await admin.storage
      .from(resumeBucketName)
      .upload(storagePath, resume, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      return errorResponse(
        uploadError.message,
        500,
        { code: "RESUME_UPLOAD_FAILED" },
        noStoreHeaders,
      );
    }

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
      .select(
        "id,file_name,file_url,storage_path,mime_type,file_size_bytes,created_at,updated_at",
      )
      .single();

    if (resumeUploadError) {
      await admin.storage.from(resumeBucketName).remove([storagePath]);

      return errorResponse(
        "Resume metadata could not be saved.",
        500,
        { code: "RESUME_METADATA_FAILED", details: resumeUploadError.message },
        noStoreHeaders,
      );
    }

    const completion = await getProfileCompletion(user.id, supabase);

    return successResponse(
      "Resume uploaded",
      {
        resume: await formatResume(resumeUpload as ResumeRow),
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

export async function DELETE() {
  const supabase = await createSupabaseServerClient();

  try {
    const user = await requireAuth(supabase);
    const admin = createSupabaseAdminClient();
    const resume = await getCurrentResumeRow(user.id);

    if (!resume) {
      const completion = await getProfileCompletion(user.id, supabase);

      return successResponse(
        "No current resume to delete",
        {
          resume: null,
          completion,
        },
        { headers: noStoreHeaders },
      );
    }

    if (resume.storage_path) {
      const { error: storageError } = await admin.storage
        .from(resumeBucketName)
        .remove([resume.storage_path]);

      if (storageError) {
        console.warn("[resume] storage delete skipped", {
          error: storageError.message,
          resumeId: resume.id,
          storagePath: resume.storage_path,
          userId: user.id,
        });
      }
    }

    const { error: deleteError } = await admin
      .from("resume_uploads")
      .delete()
      .eq("id", resume.id)
      .eq("user_id", user.id);

    if (deleteError) {
      return errorResponse(
        "Resume could not be deleted.",
        500,
        { code: "RESUME_DELETE_FAILED", details: deleteError.message },
        noStoreHeaders,
      );
    }

    const completion = await getProfileCompletion(user.id, supabase);

    return successResponse(
      "Resume deleted",
      {
        resume: await getUserResume(user.id, supabase),
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
