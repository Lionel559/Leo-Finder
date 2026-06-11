"use client";

import Link from "next/link";
import { useState } from "react";

import { fetchApi } from "@/lib/api/client";
import {
  opportunityCategories,
  remoteStatuses,
  type Opportunity,
} from "@/lib/opportunities";

type OpportunityCardProps = {
  opportunity: Opportunity;
  onSaveChange?: (opportunityId: string, saved: boolean) => void;
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
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function OpportunityCard({
  opportunity,
  onSaveChange,
}: OpportunityCardProps) {
  const [isSaved, setIsSaved] = useState(opportunity.isSaved);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleSave() {
    setIsSaving(true);
    setError(null);

    try {
      await fetchApi<{ saved: boolean }>(
        `/api/v1/opportunities/${opportunity.id}/save`,
        {
          method: isSaved ? "DELETE" : "POST",
        },
      );
      const nextSaved = !isSaved;

      setIsSaved(nextSaved);
      onSaveChange?.(opportunity.id, nextSaved);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Save action failed.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#10B981]">
            {getLabel(opportunityCategories, opportunity.category)}
          </p>
          <h2 className="mt-2 text-xl font-semibold leading-7 text-[#0F172A]">
            {opportunity.title}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            {opportunity.organization}
          </p>
        </div>
        <span className="w-fit rounded-md bg-[#0EA5E9]/10 px-3 py-1 text-sm font-semibold text-[#0369A1]">
          {opportunity.matchScore}% match
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-slate-500">Location</dt>
          <dd className="mt-1 text-[#0F172A]">
            {opportunity.location ?? "Global"}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Remote</dt>
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
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {opportunity.skills.slice(0, 6).map((skill) => (
          <span
            key={skill}
            className="rounded-md border border-slate-200 bg-[#F8FAFC] px-2 py-1 text-xs font-semibold text-slate-600"
          >
            {skill}
          </span>
        ))}
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-2 sm:mt-auto sm:flex-row sm:pt-5">
        <button
          type="button"
          onClick={toggleSave}
          disabled={isSaving}
          className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-[#0F172A] transition hover:border-[#10B981]/50 hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {isSaving ? "Saving..." : isSaved ? "Unsave" : "Save"}
        </button>
        <Link
          href={`/opportunities/${opportunity.id}`}
          className="flex h-10 items-center justify-center rounded-md bg-[#10B981] px-4 text-sm font-semibold text-white transition hover:bg-[#059669]"
        >
          View details
        </Link>
        {opportunity.applyUrl ? (
          <a
            href={opportunity.applyUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-10 items-center justify-center rounded-md bg-[#0F172A] px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Apply
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="h-10 rounded-md bg-slate-100 px-4 text-sm font-semibold text-slate-400"
          >
            Apply
          </button>
        )}
      </div>
    </article>
  );
}
