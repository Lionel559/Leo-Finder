"use client";

import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ContactSupportCard } from "@/components/settings/contact-support-card";
import { PasswordInput } from "@/components/auth/password-input";
import { TelegramConnectionCard } from "@/components/telegram/telegram-connection-card";
import type { ApiResponse } from "@/types";

type ExperienceLevel = "beginner" | "intermediate" | "advanced";

type ProfileFormState = {
  fullName: string;
  bio: string;
  experienceLevel: ExperienceLevel;
  preferredRoles: string[];
  preferredLocations: string[];
  portfolioUrl: string;
  githubUrl: string;
  linkedinUrl: string;
};

type Completion = {
  score: number;
  completedCount: number;
  totalCount: number;
  items: {
    key: string;
    label: string;
    complete: boolean;
  }[];
};

type UserSkill = {
  id: string;
  name: string;
};

type Resume = {
  id: string;
  fileName: string;
  fileUrl: string;
  signedUrl?: string | null;
  storagePath?: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  uploadedAt: string;
  updatedAt: string;
};

type Preferences = {
  preferredLocations: string[];
};

type ProfileRow = {
  full_name: string | null;
  bio: string | null;
  experience_level: ExperienceLevel | null;
  preferred_roles: string[] | null;
  website_url: string | null;
  portfolio_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
};

type ProfileResponse = {
  profile: ProfileRow;
  preferences: Preferences;
  completion: Completion;
};

type SkillsResponse = {
  skills: UserSkill[];
  completion: Completion;
};

type ResumeResponse = {
  resume: Resume | null;
  completion: Completion;
};

type SettingsClientProps = {
  userEmail: string;
  initialProfile: ProfileFormState;
  initialSkills: string[];
  initialResume: Resume | null;
  initialCompletion: Completion;
};

const roleSuggestions = [
  "Frontend Developer",
  "Backend Developer",
  "Full-stack Developer",
  "Product Manager",
  "Data Analyst",
  "UI/UX Designer",
  "AI Engineer",
  "Solidity Developer",
];

const locationSuggestions = [
  "Remote",
  "United States",
  "United Kingdom",
  "Canada",
  "Europe",
  "Africa",
  "Asia",
  "Global",
];

const skillSuggestions = [
  "React",
  "Next.js",
  "TypeScript",
  "Node.js",
  "Python",
  "Solidity",
  "UI/UX",
];

const experienceLevels: { label: string; value: ExperienceLevel }[] = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

const maxResumeSizeBytes = 10 * 1024 * 1024;

async function requestJson<TData>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const body = (await response.json()) as ApiResponse<TData>;

  if (!response.ok || !body.success) {
    throw new Error(body.message || "Request failed.");
  }

  return body.data as TData;
}

function addUnique(values: string[], value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return values;
  }

  if (values.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
    return values;
  }

  return [...values, normalized];
}

function updateValue(values: string[], index: number, nextValue: string) {
  const normalized = nextValue.replace(/\s+/g, " ");

  return values.map((value, valueIndex) =>
    valueIndex === index ? normalized : value,
  );
}

function normalizeList(values: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const item = value.trim().replace(/\s+/g, " ");
    const key = item.toLowerCase();

    if (item && !seen.has(key)) {
      seen.add(key);
      normalized.push(item);
    }
  }

  return normalized;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) {
    return "Unknown size";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getResumeFileError(file: File | null) {
  if (!file) {
    return "Choose a PDF or DOCX resume.";
  }

  const lowerName = file.name.toLowerCase();
  const isSupported =
    file.type === "application/pdf" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".pdf") ||
    lowerName.endsWith(".docx");

  if (!isSupported) {
    return "Resume must be a PDF or DOCX file.";
  }

  if (file.size > maxResumeSizeBytes) {
    return "Resume must be 10MB or smaller.";
  }

  return null;
}

function mapProfileResponse(response: ProfileResponse): ProfileFormState {
  return {
    fullName: response.profile.full_name ?? "",
    bio: response.profile.bio ?? "",
    experienceLevel: response.profile.experience_level ?? "beginner",
    preferredRoles: response.profile.preferred_roles ?? [],
    preferredLocations: response.preferences.preferredLocations ?? [],
    portfolioUrl:
      response.profile.portfolio_url ?? response.profile.website_url ?? "",
    githubUrl: response.profile.github_url ?? "",
    linkedinUrl: response.profile.linkedin_url ?? "",
  };
}

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-[#10B981]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-semibold text-[#0F172A]">{title}</h2>
    </div>
  );
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-medium text-[#0F172A]"
    >
      {children}
    </label>
  );
}

function StatusMessage({
  error,
  notice,
}: {
  error: string | null;
  notice: string | null;
}) {
  if (error) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (notice) {
    return (
      <p className="rounded-md border border-[#10B981]/20 bg-[#ECFDF5] px-3 py-2 text-sm font-medium text-[#047857]">
        {notice}
      </p>
    );
  }

  return null;
}

function EditableList({
  addLabel,
  suggestions,
  values,
  onChange,
}: {
  addLabel: string;
  suggestions: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const availableSuggestions = useMemo(
    () =>
      suggestions.filter(
        (suggestion) =>
          !values.some(
            (value) => value.toLowerCase() === suggestion.toLowerCase(),
          ),
      ),
    [suggestions, values],
  );

  function addDraft() {
    onChange(addUnique(values, draft));
    setDraft("");
  }

  return (
    <div className="space-y-3">
      {values.length > 0 ? (
        <div className="space-y-2">
          {values.map((value, index) => (
            <div key={`${value}-${index}`} className="flex gap-2">
              <input
                type="text"
                value={value}
                onChange={(event) =>
                  onChange(updateValue(values, index, event.target.value))
                }
                onBlur={() => onChange(normalizeList(values))}
                className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
              />
              <button
                type="button"
                onClick={() =>
                  onChange(values.filter((_, valueIndex) => valueIndex !== index))
                }
                className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          No entries yet.
        </p>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addDraft();
            }
          }}
          placeholder={addLabel}
          className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
        />
        <button
          type="button"
          onClick={addDraft}
          className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-[#0F172A] transition hover:border-[#10B981]/50 hover:bg-[#F8FAFC]"
        >
          Add
        </button>
      </div>

      {availableSuggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {availableSuggestions.slice(0, 8).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onChange(addUnique(values, suggestion))}
              className="min-h-9 rounded-md border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 transition hover:border-[#10B981]/50 hover:bg-[#10B981]/5 hover:text-[#047857]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SettingsClient({
  userEmail,
  initialProfile,
  initialSkills,
  initialResume,
  initialCompletion,
}: SettingsClientProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [skills, setSkills] = useState(initialSkills);
  const [resume, setResume] = useState(initialResume);
  const [completion, setCompletion] = useState(initialCompletion);
  const [selectedResume, setSelectedResume] = useState<File | null>(null);
  const [resumeInputKey, setResumeInputKey] = useState(0);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [skillsNotice, setSkillsNotice] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingSkills, setIsSavingSkills] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isDeletingResume, setIsDeletingResume] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] =
    useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadResume() {
      try {
        const response = await requestJson<ResumeResponse>("/api/v1/resume", {
          cache: "no-store",
        });

        if (isMounted) {
          setResume(response.resume);
          setCompletion(response.completion);
        }
      } catch {
        if (isMounted && initialResume) {
          setResume(initialResume);
        }
      }
    }

    void loadResume();

    return () => {
      isMounted = false;
    };
  }, [initialResume]);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileNotice(null);

    try {
      const response = await requestJson<ProfileResponse>("/api/v1/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: profile.fullName,
          bio: profile.bio,
          experienceLevel: profile.experienceLevel,
          preferredRoles: normalizeList(profile.preferredRoles),
          preferredLocations: normalizeList(profile.preferredLocations),
          portfolioUrl: profile.portfolioUrl,
          githubUrl: profile.githubUrl,
          linkedinUrl: profile.linkedinUrl,
        }),
      });

      setProfile(mapProfileResponse(response));
      setCompletion(response.completion);
      setProfileNotice("Profile saved.");
      router.refresh();
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "Profile could not be saved.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSkillsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingSkills(true);
    setSkillsError(null);
    setSkillsNotice(null);

    try {
      const response = await requestJson<SkillsResponse>("/api/v1/skills", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skills: normalizeList(skills),
        }),
      });

      setSkills(response.skills.map((skill) => skill.name));
      setCompletion(response.completion);
      setSkillsNotice("Skills saved.");
      router.refresh();
    } catch (error) {
      setSkillsError(
        error instanceof Error ? error.message : "Skills could not be saved.",
      );
    } finally {
      setIsSavingSkills(false);
    }
  }

  function handleResumeChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setSelectedResume(file);
    setResumeError(file ? getResumeFileError(file) : null);
    setResumeNotice(null);
  }

  async function handleResumeUpload() {
    const fileError = getResumeFileError(selectedResume);

    if (fileError) {
      setResumeError(fileError);
      setResumeNotice(null);
      return;
    }

    if (!selectedResume) {
      return;
    }

    setIsUploadingResume(true);
    setResumeError(null);
    setResumeNotice(null);

    const formData = new FormData();
    formData.append("resume", selectedResume);

    try {
      const response = await requestJson<ResumeResponse>("/api/v1/resume", {
        method: "POST",
        body: formData,
      });

      setResume(response.resume);
      setCompletion(response.completion);
      setSelectedResume(null);
      setResumeInputKey((key) => key + 1);
      setResumeNotice(resume ? "Resume replaced." : "Resume uploaded.");
      router.refresh();
    } catch (error) {
      setResumeError(
        error instanceof Error ? error.message : "Resume could not be uploaded.",
      );
    } finally {
      setIsUploadingResume(false);
    }
  }

  async function handleResumeDelete() {
    setIsDeletingResume(true);
    setResumeError(null);
    setResumeNotice(null);

    try {
      const response = await requestJson<ResumeResponse>("/api/v1/resume", {
        method: "DELETE",
      });

      setResume(response.resume);
      setCompletion(response.completion);
      setSelectedResume(null);
      setResumeInputKey((key) => key + 1);
      setResumeNotice("Resume deleted.");
      router.refresh();
    } catch (error) {
      setResumeError(
        error instanceof Error ? error.message : "Resume could not be deleted.",
      );
    } finally {
      setIsDeletingResume(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountError(null);
    setAccountNotice(null);

    if (newPassword !== confirmPassword) {
      setAccountError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);

    try {
      await requestJson<undefined>("/api/v1/account/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setAccountNotice("Password updated.");
    } catch (error) {
      setAccountError(
        error instanceof Error ? error.message : "Password could not be updated.",
      );
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    await fetch("/api/v1/auth/logout", {
      method: "POST",
    }).catch(() => null);
    router.replace("/login");
    router.refresh();
  }

  async function handleDeleteAccount() {
    setAccountError(null);
    setAccountNotice(null);

    if (deleteConfirmation !== "DELETE") {
      setAccountError("Type DELETE to confirm account deletion.");
      return;
    }

    setIsDeletingAccount(true);

    try {
      await requestJson<undefined>("/api/v1/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });

      router.replace("/register");
      router.refresh();
    } catch (error) {
      setAccountError(
        error instanceof Error ? error.message : "Account could not be deleted.",
      );
      setIsDeletingAccount(false);
    }
  }

  return (
    <div className="max-w-5xl space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <SectionHeader eyebrow="Completion" title="Profile Completion" />
          <div className="min-w-[160px]">
            <p className="text-right text-3xl font-semibold text-[#0F172A]">
              {completion.score}%
            </p>
            <p className="mt-1 text-right text-sm text-slate-500">
              {completion.completedCount} of {completion.totalCount} complete
            </p>
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#10B981] transition-all"
            style={{ width: `${completion.score}%` }}
          />
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-5">
          {completion.items.map((item) => (
            <div
              key={item.key}
              className="rounded-md border border-slate-200 px-3 py-3"
            >
              <p className="text-sm font-semibold text-[#0F172A]">
                {item.label}
              </p>
              <p
                className={`mt-1 text-xs font-semibold ${
                  item.complete ? "text-[#047857]" : "text-slate-500"
                }`}
              >
                {item.complete ? "Complete" : "Needed"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <form
        onSubmit={handleProfileSubmit}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader eyebrow="Profile" title="Edit Profile" />
          <button
            type="submit"
            disabled={isSavingProfile}
            className="h-10 rounded-md bg-[#10B981] px-4 text-sm font-semibold text-white transition hover:bg-[#059669] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSavingProfile ? "Saving..." : "Save Profile"}
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <FieldLabel htmlFor="full-name">Full Name</FieldLabel>
            <input
              id="full-name"
              type="text"
              required
              maxLength={120}
              value={profile.fullName}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  fullName: event.target.value,
                }))
              }
              className="mt-2 h-11 w-full rounded-md border border-slate-200 px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
            />
          </div>

          <div>
            <FieldLabel>Experience Level</FieldLabel>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {experienceLevels.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() =>
                    setProfile((current) => ({
                      ...current,
                      experienceLevel: level.value,
                    }))
                  }
                  className={`h-11 rounded-md border px-3 text-sm font-semibold transition ${
                    profile.experienceLevel === level.value
                      ? "border-[#10B981] bg-[#10B981]/10 text-[#047857]"
                      : "border-slate-200 bg-white text-[#0F172A] hover:border-[#10B981]/50"
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <FieldLabel htmlFor="bio">Bio</FieldLabel>
            <textarea
              id="bio"
              rows={5}
              maxLength={1000}
              value={profile.bio}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  bio: event.target.value,
                }))
              }
              className="mt-2 w-full resize-y rounded-md border border-slate-200 px-3 py-3 text-sm leading-6 text-[#0F172A] outline-none transition focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
            />
          </div>

          <div>
            <FieldLabel>Preferred Roles</FieldLabel>
            <div className="mt-2">
              <EditableList
                addLabel="Add a role"
                suggestions={roleSuggestions}
                values={profile.preferredRoles}
                onChange={(values) =>
                  setProfile((current) => ({
                    ...current,
                    preferredRoles: values,
                  }))
                }
              />
            </div>
          </div>

          <div>
            <FieldLabel>Preferred Locations</FieldLabel>
            <div className="mt-2">
              <EditableList
                addLabel="Add a location"
                suggestions={locationSuggestions}
                values={profile.preferredLocations}
                onChange={(values) =>
                  setProfile((current) => ({
                    ...current,
                    preferredLocations: values,
                  }))
                }
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="portfolio-url">Portfolio URL</FieldLabel>
            <input
              id="portfolio-url"
              type="url"
              value={profile.portfolioUrl}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  portfolioUrl: event.target.value,
                }))
              }
              className="mt-2 h-11 w-full rounded-md border border-slate-200 px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
            />
          </div>

          <div>
            <FieldLabel htmlFor="github-url">GitHub URL</FieldLabel>
            <input
              id="github-url"
              type="url"
              value={profile.githubUrl}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  githubUrl: event.target.value,
                }))
              }
              className="mt-2 h-11 w-full rounded-md border border-slate-200 px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
            />
          </div>

          <div>
            <FieldLabel htmlFor="linkedin-url">LinkedIn URL</FieldLabel>
            <input
              id="linkedin-url"
              type="url"
              value={profile.linkedinUrl}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  linkedinUrl: event.target.value,
                }))
              }
              className="mt-2 h-11 w-full rounded-md border border-slate-200 px-3 text-sm text-[#0F172A] outline-none transition focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
            />
          </div>
        </div>

        <div className="mt-5">
          <StatusMessage error={profileError} notice={profileNotice} />
        </div>
      </form>

      <form
        onSubmit={handleSkillsSubmit}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader eyebrow="Skills" title="Skills Management" />
          <button
            type="submit"
            disabled={isSavingSkills}
            className="h-10 rounded-md bg-[#10B981] px-4 text-sm font-semibold text-white transition hover:bg-[#059669] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSavingSkills ? "Saving..." : "Save Skills"}
          </button>
        </div>

        <div className="mt-5">
          <EditableList
            addLabel="Add a skill"
            suggestions={skillSuggestions}
            values={skills}
            onChange={setSkills}
          />
        </div>

        <div className="mt-5">
          <StatusMessage error={skillsError} notice={skillsNotice} />
        </div>
      </form>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader eyebrow="Resume" title="Resume Management" />
          <div className="flex flex-wrap gap-2">
            {resume?.signedUrl ? (
              <a
                href={resume.signedUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-semibold text-[#0F172A] transition hover:border-[#10B981]/50 hover:bg-[#F8FAFC]"
              >
                View Resume
              </a>
            ) : null}
            <button
              type="button"
              onClick={handleResumeDelete}
              disabled={!resume || isDeletingResume || isUploadingResume}
              className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-[#0F172A] transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {isDeletingResume ? "Deleting..." : "Delete Resume"}
            </button>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-200 pt-5">
          {resume ? (
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  File
                </dt>
                <dd className="mt-1 break-words text-sm font-semibold text-[#0F172A]">
                  {resume.fileName}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Size
                </dt>
                <dd className="mt-1 text-sm font-semibold text-[#0F172A]">
                  {formatFileSize(resume.fileSizeBytes)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Uploaded
                </dt>
                <dd className="mt-1 text-sm font-semibold text-[#0F172A]">
                  {formatDate(resume.uploadedAt)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
              No current resume uploaded.
            </p>
          )}
        </div>

        <div className="mt-5 rounded-md border border-dashed border-[#10B981]/40 bg-[#10B981]/5 p-4">
          <input
            key={resumeInputKey}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleResumeChange}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-[#10B981] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#059669]"
          />
          {selectedResume ? (
            <p className="mt-3 text-sm font-medium text-[#0F172A]">
              Selected: {selectedResume.name} (
              {formatFileSize(selectedResume.size)})
            </p>
          ) : null}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleResumeUpload}
              disabled={!selectedResume || isUploadingResume || isDeletingResume}
              className="h-10 rounded-md bg-[#10B981] px-4 text-sm font-semibold text-white transition hover:bg-[#059669] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isUploadingResume
                ? "Uploading..."
                : resume
                  ? "Replace Resume"
                  : "Upload Resume"}
            </button>
          </div>
        </div>

        <div className="mt-5">
          <StatusMessage error={resumeError} notice={resumeNotice} />
        </div>
      </section>

      <TelegramConnectionCard />

      <ContactSupportCard email={userEmail} />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
        <SectionHeader eyebrow="Account" title="Account Settings" />

        <form onSubmit={handlePasswordSubmit} className="mt-5 grid gap-4 lg:grid-cols-3">
          <div>
            <FieldLabel htmlFor="current-password">Current Password</FieldLabel>
            <div className="mt-2">
              <PasswordInput
                id="current-password"
                name="currentPassword"
                autoComplete="current-password"
                required={false}
                value={currentPassword}
                isVisible={isCurrentPasswordVisible}
                onChange={(event) => setCurrentPassword(event.target.value)}
                onToggle={() =>
                  setIsCurrentPasswordVisible((visible) => !visible)
                }
              />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="new-password">New Password</FieldLabel>
            <div className="mt-2">
              <PasswordInput
                id="new-password"
                name="newPassword"
                autoComplete="new-password"
                minLength={8}
                required={false}
                value={newPassword}
                isVisible={isNewPasswordVisible}
                onChange={(event) => setNewPassword(event.target.value)}
                onToggle={() => setIsNewPasswordVisible((visible) => !visible)}
              />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
            <div className="mt-2">
              <PasswordInput
                id="confirm-password"
                name="confirmPassword"
                autoComplete="new-password"
                minLength={8}
                required={false}
                value={confirmPassword}
                isVisible={isConfirmPasswordVisible}
                onChange={(event) => setConfirmPassword(event.target.value)}
                onToggle={() =>
                  setIsConfirmPasswordVisible((visible) => !visible)
                }
              />
            </div>
          </div>
          <div className="lg:col-span-3">
            <button
              type="submit"
              disabled={isChangingPassword}
              className="h-10 rounded-md bg-[#10B981] px-4 text-sm font-semibold text-white transition hover:bg-[#059669] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isChangingPassword ? "Updating..." : "Change Password"}
            </button>
          </div>
        </form>

        <div className="mt-5 border-t border-slate-200 pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <FieldLabel htmlFor="delete-confirmation">
                Delete Account Confirmation
              </FieldLabel>
              <input
                id="delete-confirmation"
                type="text"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                className="mt-2 h-11 w-full max-w-sm rounded-md border border-slate-200 px-3 text-sm text-[#0F172A] outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-[#0F172A] transition hover:border-[#10B981]/50 hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || deleteConfirmation !== "DELETE"}
                className="h-10 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {isDeletingAccount ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <StatusMessage error={accountError} notice={accountNotice} />
        </div>
      </section>
    </div>
  );
}
