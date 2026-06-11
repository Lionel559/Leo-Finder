"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchApi } from "@/lib/api/client";
import type { DashboardData } from "@/lib/opportunities";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";

type DashboardClientProps = {
  fallbackName: string;
};

type RecommendationsResponse = {
  opportunities: DashboardData["recommendedOpportunities"];
  total: number;
};

function formatFileSize(bytes: number | null) {
  if (!bytes) {
    return "";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white"
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-lg border border-slate-200 bg-white" />
        <div className="h-72 animate-pulse rounded-lg border border-slate-200 bg-white" />
      </div>
    </div>
  );
}

export function DashboardClient({ fallbackName }: DashboardClientProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);

      try {
        const dashboard = await fetchApi<DashboardData>("/api/v1/dashboard");
        let recommendedOpportunities = dashboard.recommendedOpportunities;

        try {
          const recommendations = await fetchApi<RecommendationsResponse>(
            "/api/v1/recommendations?limit=4",
          );

          recommendedOpportunities = recommendations.opportunities;
        } catch (recommendationError) {
          console.warn("[dashboard] recommendations endpoint skipped", {
            error:
              recommendationError instanceof Error
                ? recommendationError.message
                : String(recommendationError),
          });
        }

        if (isMounted) {
          setData({
            ...dashboard,
            recommendedOpportunities,
          });
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Dashboard could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <h2 className="text-xl font-semibold text-[#0F172A]">
          Dashboard is empty
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Your dashboard will fill in when opportunities are available.
        </p>
      </div>
    );
  }

  const displayName =
    data.profile.fullName ?? data.user.email?.split("@")[0] ?? fallbackName;
  const resumeLabel = data.stats.resumeStatus.uploaded
    ? `${data.stats.resumeStatus.fileName ?? "Resume uploaded"} ${formatFileSize(
        data.stats.resumeStatus.fileSizeBytes,
      )}`
    : "No current resume";

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#0F172A]">
              Welcome, {displayName}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Your opportunity profile is active and ready for database-driven
              recommendations.
            </p>
          </div>
          <Link
            href="/opportunities"
            className="flex h-11 w-fit items-center rounded-md bg-[#10B981] px-5 text-sm font-semibold text-white transition hover:bg-[#059669]"
          >
            Browse opportunities
          </Link>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-slate-600">
              Profile completion
            </span>
            <span className="font-semibold text-[#0F172A]">
              {data.stats.profileCompletionScore}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#10B981]"
              style={{ width: `${data.stats.profileCompletionScore}%` }}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
          <p className="text-sm font-medium text-slate-500">
            Total opportunities
          </p>
          <p className="mt-3 text-3xl font-semibold text-[#0F172A]">
            {data.stats.totalOpportunities}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
          <p className="text-sm font-medium text-slate-500">
            Saved opportunities
          </p>
          <p className="mt-3 text-3xl font-semibold text-[#047857]">
            {data.stats.savedOpportunities}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
          <p className="text-sm font-medium text-slate-500">
            Applications tracked
          </p>
          <p className="mt-3 text-3xl font-semibold text-[#0369A1]">
            {data.stats.applicationsTracked}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
          <p className="text-sm font-medium text-slate-500">Resume status</p>
          <p className="mt-3 text-base font-semibold text-[#0F172A]">
            {resumeLabel}
          </p>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-[#0F172A]">
            Recommended opportunities
          </h2>
          <Link
            href="/opportunities"
            className="text-sm font-semibold text-[#10B981] hover:text-[#059669]"
          >
            View all
          </Link>
        </div>
        {data.recommendedOpportunities.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {data.recommendedOpportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <p className="font-semibold text-[#0F172A]">
              No recommendations yet
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Seed or publish opportunities to see recommended matches.
            </p>
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-[#0F172A]">
            Recent opportunities
          </h2>
          <Link
            href="/opportunities?sort=newest"
            className="text-sm font-semibold text-[#10B981] hover:text-[#059669]"
          >
            Explore feed
          </Link>
        </div>
        {data.recentOpportunities.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {data.recentOpportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <p className="font-semibold text-[#0F172A]">
              No recent opportunities
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Published opportunities will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
