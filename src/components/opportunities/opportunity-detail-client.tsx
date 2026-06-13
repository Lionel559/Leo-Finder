"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchApi } from "@/lib/api/client";
import {
  applicationStatuses,
  opportunityCategories,
  remoteStatuses,
  type Application,
  type Opportunity,
} from "@/lib/opportunities";

type OpportunityDetailClientProps = {
  opportunityId: string;
};

type OpportunityResponse = {
  opportunity: Opportunity;
};

type ApplicationResponse = {
  application: Application;
};

function getLabel<T extends string>(
  options: readonly { label: string; value: T }[],
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No deadline";
  }

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function renderEligibility(value: unknown) {
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
        {value.map((item, index) => (
          <li key={`${String(item)}-${index}`}>{String(item)}</li>
        ))}
      </ul>
    );
  }

  if (value && typeof value === "object") {
    return (
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {Object.entries(value as Record<string, unknown>).map(([key, item]) => (
          <div key={key} className="border-t border-slate-200 pt-3">
            <dt className="font-medium capitalize text-slate-500">
              {key.replace(/_/g, " ")}
            </dt>
            <dd className="mt-1 text-[#0F172A]">
              {Array.isArray(item) ? item.join(", ") : String(item)}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  if (typeof value === "string" && value.trim()) {
    return <p className="text-sm leading-6 text-slate-600">{value}</p>;
  }

  return <p className="text-sm text-slate-500">Not specified</p>;
}

export function OpportunityDetailClient({
  opportunityId,
}: OpportunityDetailClientProps) {
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadOpportunity() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchApi<OpportunityResponse>(
          `/api/v1/opportunities/${opportunityId}`,
        );

        if (isMounted) {
          setOpportunity(data.opportunity);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Opportunity could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadOpportunity();

    return () => {
      isMounted = false;
    };
  }, [opportunityId]);

  async function toggleSave() {
    if (!opportunity) return;

    setIsSaving(true);
    setActionError(null);

    try {
      await fetchApi<{ saved: boolean }>(
        `/api/v1/opportunities/${opportunity.id}/save`,
        { method: opportunity.isSaved ? "DELETE" : "POST" },
      );
      setOpportunity({ ...opportunity, isSaved: !opportunity.isSaved });
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error ? caughtError.message : "Save failed.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function trackApplication() {
    if (!opportunity) return;

    setIsTracking(true);
    setActionError(null);

    try {
      const data = await fetchApi<ApplicationResponse>("/api/v1/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          opportunityId: opportunity.id,
          status: "saved",
        }),
      });

      setOpportunity({
        ...opportunity,
        application: {
          id: data.application.id,
          status: data.application.status,
        },
      });
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Application tracking failed.",
      );
    } finally {
      setIsTracking(false);
    }
  }

  if (isLoading) {
    return (
      <div className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white" />
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <h2 className="text-xl font-semibold text-[#0F172A]">
          Opportunity not found
        </h2>
        <Link
          href="/opportunities"
          className="mt-4 inline-flex h-10 items-center rounded-md bg-[#10B981] px-4 text-sm font-semibold text-white"
        >
          Back to opportunities
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#10B981]">
              {getLabel(opportunityCategories, opportunity.category)}
            </p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#0F172A]">
              {opportunity.title}
            </h2>
            <p className="mt-2 text-base font-medium text-slate-600">
              {opportunity.organization}
            </p>
          </div>
          <span className="w-fit rounded-md bg-[#0EA5E9]/10 px-3 py-1 text-sm font-semibold text-[#0369A1]">
            {opportunity.match?.overallScore ?? opportunity.matchScore}% match
          </span>
        </div>

        <section className="mt-7">
          <h3 className="text-lg font-semibold text-[#0F172A]">Description</h3>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
            {opportunity.description}
          </p>
        </section>

        <section className="mt-7">
          <h3 className="text-lg font-semibold text-[#0F172A]">Eligibility</h3>
          <div className="mt-3">{renderEligibility(opportunity.eligibility)}</div>
        </section>

        <section className="mt-7">
          <h3 className="text-lg font-semibold text-[#0F172A]">
            Skills required
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {opportunity.skills.length > 0 ? (
              opportunity.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-md border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-slate-600"
                >
                  {skill}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-500">No skills listed</p>
            )}
          </div>
        </section>

        {opportunity.match ? (
          <details className="mt-7 rounded-md border border-slate-200 bg-[#F8FAFC] p-4">
            <summary className="cursor-pointer text-lg font-semibold text-[#0F172A]">
              Why this match?
            </summary>
            <div className="mt-4 space-y-5">
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Skills
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[#0F172A]">
                    {opportunity.match.skillMatchScore}%
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Preferences
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[#0F172A]">
                    {opportunity.match.preferenceMatchScore}%
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Resume
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[#0F172A]">
                    {opportunity.match.experienceMatchScore}%
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Memory
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[#0F172A]">
                    {opportunity.match.historyMatchScore}%
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">
                  Reasons
                </p>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
                  {opportunity.match.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">
                  Missing skills
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {opportunity.match.missingSkills.length > 0
                    ? opportunity.match.missingSkills.join(", ")
                    : "No major missing skills detected."}
                </p>
              </div>
              <p className="rounded-md border border-[#10B981]/20 bg-white px-3 py-2 text-sm font-medium leading-6 text-[#0F172A]">
                {opportunity.match.recommendation}
              </p>
            </div>
          </details>
        ) : null}
      </article>

      <aside className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
          <h3 className="text-lg font-semibold text-[#0F172A]">Overview</h3>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-medium text-slate-500">Location</dt>
              <dd className="mt-1 text-[#0F172A]">
                {opportunity.location ?? "Global"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Remote status</dt>
              <dd className="mt-1 text-[#0F172A]">
                {getLabel(remoteStatuses, opportunity.remoteStatus)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Deadline</dt>
              <dd className="mt-1 text-[#0F172A]">
                {formatDate(opportunity.deadline)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Salary / reward</dt>
              <dd className="mt-1 text-[#0F172A]">
                {opportunity.salaryPrizeAmount ?? "Not listed"}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Application status</dt>
              <dd className="mt-1 text-[#0F172A]">
                {opportunity.application
                  ? getLabel(applicationStatuses, opportunity.application.status)
                  : "Not tracked"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={toggleSave}
              disabled={isSaving}
              className="h-11 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-[#0F172A] transition hover:border-[#10B981]/50 hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {isSaving
                ? "Saving..."
                : opportunity.isSaved
                  ? "Unsave opportunity"
                  : "Save opportunity"}
            </button>
            <button
              type="button"
              onClick={trackApplication}
              disabled={isTracking}
              className="h-11 rounded-md bg-[#10B981] px-4 text-sm font-semibold text-white transition hover:bg-[#059669] disabled:cursor-not-allowed disabled:bg-[#10B981]/40"
            >
              {isTracking
                ? "Tracking..."
                : opportunity.application
                  ? "Application tracked"
                  : "Track application"}
            </button>
            <button
              type="button"
              disabled
              className="h-11 cursor-not-allowed rounded-md bg-[#0F172A]/5 px-4 text-sm font-semibold text-slate-400"
            >
              Generate cover letter (Coming soon)
            </button>
            {opportunity.applyUrl ? (
              <a
                href={opportunity.applyUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 items-center justify-center rounded-md bg-[#0F172A] px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Apply link
              </a>
            ) : null}
            <a
              href={opportunity.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-[#0F172A] transition hover:border-[#10B981]/50 hover:bg-[#F8FAFC]"
            >
              Source URL
            </a>
          </div>
          {actionError ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
