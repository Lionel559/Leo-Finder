"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchApi } from "@/lib/api/client";
import {
  applicationStatuses,
  type Application,
  type ApplicationStatus,
} from "@/lib/opportunities";

type ApplicationsResponse = {
  applications: Application[];
  total: number;
};

type ApplicationResponse = {
  application: Application;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function ApplicationsPageClient() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadApplications() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchApi<ApplicationsResponse>("/api/v1/applications");

        if (isMounted) {
          setApplications(data.applications);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Applications could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadApplications();

    return () => {
      isMounted = false;
    };
  }, []);

  async function updateStatus(applicationId: string, status: ApplicationStatus) {
    setUpdatingId(applicationId);
    setError(null);

    try {
      const data = await fetchApi<ApplicationResponse>(
        `/api/v1/applications/${applicationId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );

      setApplications((current) =>
        current.map((application) =>
          application.id === applicationId ? data.application : application,
        ),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Application status could not be updated.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white"
          />
        ))}
      </div>
    );
  }

  if (applications.length === 0 && !error) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <h2 className="text-xl font-semibold text-[#0F172A]">
          No applications tracked
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Track an opportunity from its detail page to manage its status here.
        </p>
        <Link
          href="/opportunities"
          className="mt-5 inline-flex h-10 items-center rounded-md bg-[#10B981] px-4 text-sm font-semibold text-white"
        >
          Find opportunities
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {applications.map((application) => (
        <article
          key={application.id}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#10B981]">
                {application.opportunity?.organization ?? "Opportunity"}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#0F172A]">
                {application.opportunity?.title ?? "Opportunity unavailable"}
              </h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="font-medium text-slate-500">Applied at</dt>
                  <dd className="mt-1 text-[#0F172A]">
                    {formatDate(application.appliedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Updated</dt>
                  <dd className="mt-1 text-[#0F172A]">
                    {formatDate(application.updatedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Deadline</dt>
                  <dd className="mt-1 text-[#0F172A]">
                    {formatDate(application.opportunity?.deadline ?? null)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              <select
                value={application.status}
                disabled={updatingId === application.id}
                onChange={(event) =>
                  void updateStatus(
                    application.id,
                    event.target.value as ApplicationStatus,
                  )
                }
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-[#0F172A] outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
              >
                {applicationStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              {application.opportunity ? (
                <Link
                  href={`/opportunities/${application.opportunity.id}`}
                  className="flex h-10 items-center justify-center rounded-md bg-[#10B981] px-4 text-sm font-semibold text-white transition hover:bg-[#059669]"
                >
                  View details
                </Link>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
