"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchApi } from "@/lib/api/client";
import {
  opportunityCategories,
  remoteStatuses,
  type Opportunity,
  type OpportunitySort,
} from "@/lib/opportunities";
import { OpportunityCard } from "./opportunity-card";

type OpportunitiesResponse = {
  opportunities: Opportunity[];
  total: number;
};

function FeedSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-72 animate-pulse rounded-lg border border-slate-200 bg-white"
        />
      ))}
    </div>
  );
}

export function OpportunitiesPageClient() {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [remoteStatus, setRemoteStatus] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState("");
  const [sort, setSort] = useState<OpportunitySort>("newest");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (keyword.trim()) params.set("q", keyword.trim());
    if (category) params.set("category", category);
    if (remoteStatus) params.set("remoteStatus", remoteStatus);
    if (location.trim()) params.set("location", location.trim());
    if (skills.trim()) params.set("skills", skills.trim());
    params.set("sort", sort);

    return params.toString();
  }, [category, keyword, location, remoteStatus, skills, sort]);

  useEffect(() => {
    let isMounted = true;

    async function loadOpportunities() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchApi<OpportunitiesResponse>(
          `/api/v1/opportunities?${queryString}`,
        );

        if (isMounted) {
          setOpportunities(data.opportunities);
          setTotal(data.total);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Opportunities could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadOpportunities();

    return () => {
      isMounted = false;
    };
  }, [queryString]);

  function handleSaveChange(opportunityId: string, saved: boolean) {
    setOpportunities((current) =>
      current.map((opportunity) =>
        opportunity.id === opportunityId
          ? { ...opportunity, isSaved: saved }
          : opportunity,
      ),
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search title, organization, skill"
            className="h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
          >
            <option value="">All categories</option>
            {opportunityCategories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={remoteStatus}
            onChange={(event) => setRemoteStatus(event.target.value)}
            className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
          >
            <option value="">All remote statuses</option>
            {remoteStatuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_0.7fr]">
          <input
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Filter location"
            className="h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
          />
          <input
            type="text"
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
            placeholder="Filter skills, comma separated"
            className="h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
          />
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as OpportunitySort)}
            className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
          >
            <option value="newest">Newest</option>
            <option value="deadline">Deadline</option>
          </select>
        </div>
      </section>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-slate-600">
          {total} opportunities
        </p>
        <button
          type="button"
          onClick={() => {
            setKeyword("");
            setCategory("");
            setRemoteStatus("");
            setLocation("");
            setSkills("");
            setSort("newest");
          }}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-[#0F172A] transition hover:border-[#10B981]/50"
        >
          Clear filters
        </button>
      </div>

      {isLoading ? <FeedSkeleton /> : null}

      {!isLoading && error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!isLoading && !error && opportunities.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold text-[#0F172A]">
            No opportunities found
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Try clearing filters or seed sample opportunities.
          </p>
        </div>
      ) : null}

      {!isLoading && !error && opportunities.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              onSaveChange={handleSaveChange}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
