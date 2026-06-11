"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";

import { TelegramConnectionCard } from "@/components/telegram/telegram-connection-card";
import type { ApiResponse } from "@/types";

const steps = [
  {
    title: "Career Profile",
    navLabel: "Career",
  },
  {
    title: "Skills",
    navLabel: "Skills",
  },
  {
    title: "Resume Upload",
    navLabel: "Resume",
  },
  {
    title: "Opportunity Preferences",
    navLabel: "Preferences",
  },
  {
    title: "Telegram Alerts",
    navLabel: "Telegram",
  },
] as const;

const roleOptions = [
  "Frontend Developer",
  "Backend Developer",
  "Full-stack Developer",
  "Product Manager",
  "Data Analyst",
  "UI/UX Designer",
  "AI Engineer",
  "Solidity Developer",
];

const locationOptions = [
  "Remote",
  "United States",
  "United Kingdom",
  "Canada",
  "Europe",
  "Africa",
  "Asia",
  "Global",
];

const skillOptions = [
  "React",
  "Next.js",
  "TypeScript",
  "Node.js",
  "Python",
  "UI/UX",
  "Solidity",
];

const experienceLevels = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
] as const;

const remotePreferenceOptions = [
  { label: "Remote", value: "remote" },
  { label: "Hybrid", value: "hybrid" },
  { label: "On-site", value: "onsite" },
  { label: "Flexible", value: "unknown" },
] as const;

const opportunityTypes = [
  { label: "Jobs", value: "job" },
  { label: "Internships", value: "internship" },
  { label: "Bounties", value: "bounty" },
  { label: "Grants", value: "grant" },
  { label: "Scholarships", value: "scholarship" },
  { label: "Fellowships", value: "fellowship" },
  { label: "Startup Programs", value: "startup_program" },
  { label: "Hackathons", value: "hackathon" },
] as const;

const maxResumeSizeBytes = 10 * 1024 * 1024;

type ExperienceLevel = (typeof experienceLevels)[number]["value"];
type RemotePreference = (typeof remotePreferenceOptions)[number]["value"];
type OpportunityType = (typeof opportunityTypes)[number]["value"];

type OnboardingFormProps = {
  initialName: string;
  initialOnboarding?: {
    coreCompleted: boolean;
    experienceLevel: string | null;
    preferredLocations: string[];
    preferredOpportunityTypes: string[];
    preferredRoles: string[];
    remotePreference: string | null;
    resumeUpload: {
      fileName: string | null;
      fileSizeBytes: number | null;
    } | null;
    skills: string[];
  };
};

type OnboardingResponse = {
  resumeUpload?: {
    id: string;
    file_name: string;
    file_size?: number;
  };
};

type CompleteOnboardingResponse = {
  profile?: {
    onboarding_completed?: boolean;
  };
};

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
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

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileError(file: File | null, hasSavedResume = false) {
  if (!file) {
    if (hasSavedResume) {
      return null;
    }

    return "Upload a PDF or DOCX resume.";
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

function getSelectedLabels<TValue extends string>(
  options: readonly { label: string; value: TValue }[],
  values: TValue[],
) {
  return options
    .filter((option) => values.includes(option.value))
    .map((option) => option.label);
}

async function completeOnboarding() {
  const response = await fetch("/api/v1/onboarding/complete", {
    method: "POST",
  });
  const body = (await response.json()) as ApiResponse<CompleteOnboardingResponse>;

  if (!response.ok || !body.success) {
    throw new Error(body.message || "Onboarding could not be completed.");
  }

  return body.data;
}

function isExperienceLevel(value: string | null): value is ExperienceLevel {
  return experienceLevels.some((level) => level.value === value);
}

function isRemotePreference(value: string | null): value is RemotePreference {
  return remotePreferenceOptions.some((option) => option.value === value);
}

function getOpportunityTypes(values: string[]) {
  return values.filter((value): value is OpportunityType =>
    opportunityTypes.some((option) => option.value === value),
  );
}

export function OnboardingForm({
  initialName,
  initialOnboarding,
}: OnboardingFormProps) {
  const router = useRouter();
  const initialStep = initialOnboarding?.coreCompleted ? 4 : 0;
  const rawInitialExperienceLevel = initialOnboarding?.experienceLevel ?? null;
  const rawInitialRemotePreference = initialOnboarding?.remotePreference ?? null;
  const initialExperienceLevel = isExperienceLevel(rawInitialExperienceLevel)
    ? rawInitialExperienceLevel
    : "beginner";
  const initialRemotePreference = isRemotePreference(
    rawInitialRemotePreference,
  )
    ? rawInitialRemotePreference
    : null;
  const [step, setStep] = useState(initialStep);
  const [highestStep, setHighestStep] = useState(initialStep);
  const [preferredRoles, setPreferredRoles] = useState<string[]>(
    initialOnboarding?.preferredRoles ?? [],
  );
  const [customRole, setCustomRole] = useState("");
  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel>(initialExperienceLevel);
  const [preferredLocations, setPreferredLocations] = useState<string[]>(
    initialOnboarding?.preferredLocations ?? [],
  );
  const [customLocation, setCustomLocation] = useState("");
  const [remotePreference, setRemotePreference] =
    useState<RemotePreference | null>(initialRemotePreference);
  const [skills, setSkills] = useState<string[]>(
    initialOnboarding?.skills ?? [],
  );
  const [customSkill, setCustomSkill] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [preferredOpportunityTypes, setPreferredOpportunityTypes] = useState<
    OpportunityType[]
  >(getOpportunityTypes(initialOnboarding?.preferredOpportunityTypes ?? []));
  const [savedResumeName, setSavedResumeName] = useState<string | null>(
    initialOnboarding?.resumeUpload?.fileName ?? null,
  );
  const [savedResumeSize, setSavedResumeSize] = useState<number | null>(
    initialOnboarding?.resumeUpload?.fileSizeBytes ?? null,
  );
  const [isComplete, setIsComplete] = useState(
    Boolean(initialOnboarding?.coreCompleted),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const progressPercent = useMemo(
    () => Math.round(((step + 1) / steps.length) * 100),
    [step],
  );
  const selectedCategoryLabels = useMemo(
    () => getSelectedLabels(opportunityTypes, preferredOpportunityTypes),
    [preferredOpportunityTypes],
  );
  const selectedRemotePreference = remotePreferenceOptions.find(
    (option) => option.value === remotePreference,
  );

  function validateStep(currentStep = step) {
    if (currentStep === 0) {
      if (preferredRoles.length === 0) {
        return "Choose at least one preferred role.";
      }

      if (preferredLocations.length === 0) {
        return "Choose at least one preferred location.";
      }

      if (!remotePreference) {
        return "Choose a remote preference.";
      }
    }

    if (currentStep === 1 && skills.length === 0) {
      return "Choose or add at least one skill.";
    }

    if (currentStep === 2) {
      return getFileError(resume, Boolean(savedResumeName));
    }

    if (currentStep === 3 && preferredOpportunityTypes.length === 0) {
      return "Choose at least one opportunity type.";
    }

    return null;
  }

  function saveAndContinue() {
    const stepError = validateStep();

    if (stepError) {
      setError(stepError);
      return;
    }

    setError(null);
    setStep((currentStep) => {
      const nextStep = Math.min(currentStep + 1, steps.length - 1);
      setHighestStep((currentHighest) => Math.max(currentHighest, nextStep));
      return nextStep;
    });
  }

  function goBack() {
    setError(null);
    setStep((currentStep) => Math.max(currentStep - 1, 0));
  }

  function goToStep(nextStep: number) {
    if (nextStep > highestStep || isSubmitting) {
      return;
    }

    setError(null);
    setStep(nextStep);
  }

  function handleResumeChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setResume(file);
    setSavedResumeName(null);
    setSavedResumeSize(null);
    setError(file ? getFileError(file) : null);
  }

  async function submitOnboarding() {
    const stepError = validateStep(3);

    if (stepError) {
      setError(stepError);
      return;
    }

    if (!resume || !remotePreference) {
      setError("Complete every onboarding step before saving.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append(
      "payload",
      JSON.stringify({
        preferredRoles,
        experienceLevel,
        preferredLocations,
        remotePreference,
        skills,
        preferredOpportunityTypes,
      }),
    );
    formData.append("resume", resume);

    try {
      const response = await fetch("/api/v1/onboarding", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as ApiResponse<OnboardingResponse>;

      if (!response.ok || !body.success) {
        throw new Error(body.message || "Onboarding could not be saved.");
      }

      setSavedResumeName(body.data?.resumeUpload?.file_name ?? resume.name);
      setSavedResumeSize(body.data?.resumeUpload?.file_size ?? resume.size);
      setIsComplete(true);
      setHighestStep(4);
      setStep(4);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Onboarding could not be saved.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step < 3) {
      saveAndContinue();
      return;
    }

    if (step === 3) {
      await submitOnboarding();
    }
  }

  async function completeAndGoToDashboard() {
    if (!isComplete) {
      setError("Save the required onboarding steps before opening dashboard.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await completeOnboarding();
      router.replace("/dashboard");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Onboarding could not be completed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 sm:p-6"
    >
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#10B981]">
              Step {step + 1} of {steps.length}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[#0F172A]">
              {steps[step].title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Personalizing Leo Finder for {initialName}.
            </p>
          </div>
          <span className="w-fit rounded-md bg-[#10B981]/10 px-3 py-1 text-sm font-semibold text-[#10B981]">
            {progressPercent}%
          </span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#10B981] transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <ol className="mt-5 grid gap-2 sm:grid-cols-5">
          {steps.map((item, index) => {
            const isActive = step === index;
            const isAvailable = index <= highestStep;
            const isDone = index < step || (index === 4 && isComplete);

            return (
              <li key={item.navLabel}>
                <button
                  type="button"
                  onClick={() => goToStep(index)}
                  disabled={!isAvailable || isSubmitting}
                  className={`flex h-12 w-full items-center gap-2 rounded-md border px-2 text-left text-xs font-semibold transition ${
                    isActive
                      ? "border-[#10B981] bg-[#10B981]/10 text-[#0F172A]"
                      : "border-slate-200 bg-white text-slate-500 hover:border-[#10B981]/40"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                      isDone || isActive
                        ? "bg-[#10B981] text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 truncate">{item.navLabel}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-8">
        {step === 0 ? (
          <div className="space-y-7">
            <div>
              <label className="text-sm font-medium text-[#0F172A]">
                Preferred Roles
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ...roleOptions,
                  ...preferredRoles.filter(
                    (role) => !roleOptions.includes(role),
                  ),
                ].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() =>
                      setPreferredRoles(toggleValue(preferredRoles, role))
                    }
                    className={`min-h-10 rounded-md border px-3 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm ${
                      preferredRoles.includes(role)
                        ? "border-[#10B981] bg-[#10B981]/10 text-[#047857]"
                        : "border-slate-200 bg-white text-[#0F172A] hover:border-[#10B981]/50"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={customRole}
                  onChange={(event) => setCustomRole(event.target.value)}
                  placeholder="Add a role"
                  className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPreferredRoles(addUnique(preferredRoles, customRole));
                    setCustomRole("");
                  }}
                  className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-[#0F172A] transition hover:border-[#10B981]/50 hover:bg-[#F8FAFC]"
                >
                  Add
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#0F172A]">
                Experience Level
              </label>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {experienceLevels.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setExperienceLevel(level.value)}
                    className={`h-11 rounded-md border px-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-sm ${
                      experienceLevel === level.value
                        ? "border-[#10B981] bg-[#10B981]/10 text-[#047857]"
                        : "border-slate-200 bg-white text-[#0F172A] hover:border-[#10B981]/50"
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#0F172A]">
                Preferred Locations
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ...locationOptions,
                  ...preferredLocations.filter(
                    (location) => !locationOptions.includes(location),
                  ),
                ].map((location) => (
                  <button
                    key={location}
                    type="button"
                    onClick={() =>
                      setPreferredLocations(
                        toggleValue(preferredLocations, location),
                      )
                    }
                    className={`min-h-10 rounded-md border px-3 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm ${
                      preferredLocations.includes(location)
                        ? "border-[#10B981] bg-[#10B981]/10 text-[#047857]"
                        : "border-slate-200 bg-white text-[#0F172A] hover:border-[#10B981]/50"
                    }`}
                  >
                    {location}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={customLocation}
                  onChange={(event) => setCustomLocation(event.target.value)}
                  placeholder="Add a location"
                  className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPreferredLocations(
                      addUnique(preferredLocations, customLocation),
                    );
                    setCustomLocation("");
                  }}
                  className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-[#0F172A] transition hover:border-[#10B981]/50 hover:bg-[#F8FAFC]"
                >
                  Add
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#0F172A]">
                Remote Preference
              </label>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                {remotePreferenceOptions.map((preference) => (
                  <button
                    key={preference.value}
                    type="button"
                    onClick={() => setRemotePreference(preference.value)}
                    className={`h-11 rounded-md border px-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-sm ${
                      remotePreference === preference.value
                        ? "border-[#10B981] bg-[#10B981]/10 text-[#047857]"
                        : "border-slate-200 bg-white text-[#0F172A] hover:border-[#10B981]/50"
                    }`}
                  >
                    {preference.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-7">
            <div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-[#0F172A]">
                  Select Skills
                </label>
                <span className="text-sm font-semibold text-[#10B981]">
                  {skills.length} selected
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ...skillOptions,
                  ...skills.filter((skill) => !skillOptions.includes(skill)),
                ].map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => setSkills(toggleValue(skills, skill))}
                    className={`min-h-10 rounded-md border px-3 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm ${
                      skills.includes(skill)
                        ? "border-[#10B981] bg-[#10B981]/10 text-[#047857]"
                        : "border-slate-200 bg-white text-[#0F172A] hover:border-[#10B981]/50"
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#0F172A]">
                Add Custom Skill
              </label>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(event) => setCustomSkill(event.target.value)}
                  placeholder="Add a skill"
                  className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSkills(addUnique(skills, customSkill));
                    setCustomSkill("");
                  }}
                  className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-[#0F172A] transition hover:border-[#10B981]/50 hover:bg-[#F8FAFC]"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <label htmlFor="resume" className="text-sm font-medium text-[#0F172A]">
              PDF or DOCX Resume
            </label>
            <div className="rounded-lg border border-dashed border-[#10B981]/50 bg-[#10B981]/5 p-5">
              <input
                id="resume"
                name="resume"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleResumeChange}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-[#10B981] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#059669]"
              />
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Files are stored in Supabase Storage. Maximum size: 10MB.
              </p>
              {resume ? (
                <p className="mt-3 text-sm font-medium text-[#0F172A]">
                  Selected: {resume.name} ({formatFileSize(resume.size)})
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <label className="text-sm font-medium text-[#0F172A]">
              Preferred Opportunity Types
            </label>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {opportunityTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() =>
                    setPreferredOpportunityTypes(
                      toggleValue(preferredOpportunityTypes, type.value),
                    )
                  }
                  className={`min-h-12 rounded-md border px-3 py-3 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm ${
                    preferredOpportunityTypes.includes(type.value)
                      ? "border-[#10B981] bg-[#10B981]/10 text-[#047857]"
                      : "border-slate-200 bg-white text-[#0F172A] hover:border-[#10B981]/50"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#10B981]">
                Optional alerts
              </p>
              <h3 className="mt-2 text-3xl font-semibold text-[#0F172A]">
                Connect Telegram for faster alerts
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Connect Telegram to receive opportunity alerts, or skip this
                step and connect later from settings.
              </p>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="border-t border-slate-200 pt-4">
                <dt className="text-sm font-medium text-slate-500">
                  Skills Count
                </dt>
                <dd className="mt-1 text-xl font-semibold text-[#0F172A]">
                  {skills.length}
                </dd>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <dt className="text-sm font-medium text-slate-500">
                  Resume Uploaded
                </dt>
                <dd className="mt-1 text-sm font-semibold text-[#0F172A]">
                  {savedResumeName ?? resume?.name ?? "No"}
                  {savedResumeSize ? ` (${formatFileSize(savedResumeSize)})` : ""}
                </dd>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <dt className="text-sm font-medium text-slate-500">
                  Preferred Categories
                </dt>
                <dd className="mt-1 text-sm font-semibold leading-6 text-[#0F172A]">
                  {selectedCategoryLabels.join(", ")}
                </dd>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <dt className="text-sm font-medium text-slate-500">
                  Preferred Roles
                </dt>
                <dd className="mt-1 text-sm font-semibold leading-6 text-[#0F172A]">
                  {preferredRoles.join(", ")}
                </dd>
              </div>
              <div className="border-t border-slate-200 pt-4 sm:col-span-2">
                <dt className="text-sm font-medium text-slate-500">
                  Remote Preference
                </dt>
                <dd className="mt-1 text-sm font-semibold text-[#0F172A]">
                  {selectedRemotePreference?.label ?? "Flexible"}
                </dd>
              </div>
            </dl>

            <TelegramConnectionCard compact />
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {step === 4 ? (
          <div className="flex w-full flex-col-reverse gap-3 sm:ml-auto sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={completeAndGoToDashboard}
              disabled={!isComplete || isSubmitting}
              className="h-11 rounded-md border border-slate-200 bg-white px-5 text-sm font-semibold text-[#0F172A] transition hover:border-[#10B981]/50 hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={completeAndGoToDashboard}
              disabled={!isComplete || isSubmitting}
              className="h-11 rounded-md bg-[#10B981] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#059669] hover:shadow-md hover:shadow-[#10B981]/20 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#10B981]/40 disabled:shadow-none"
            >
              {isSubmitting ? "Opening..." : "Go to Dashboard"}
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0 || isSubmitting}
              className="h-11 rounded-md border border-slate-200 bg-white px-5 text-sm font-semibold text-[#0F172A] transition hover:border-[#10B981]/50 hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Back
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 rounded-md bg-[#10B981] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#059669] hover:shadow-md hover:shadow-[#10B981]/20 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#10B981]/40 disabled:shadow-none"
            >
              {isSubmitting ? "Saving..." : "Save and continue"}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
