"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchApi } from "@/lib/api/client";
import type { Opportunity } from "@/lib/opportunities";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";

type SavedResponse = {
  opportunities: Opportunity[];
  total: number;
};

export function SavedPageClient() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSaved() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchApi<SavedResponse>("/api/v1/saved");

        if (isMounted) {
          setOpportunities(data.opportunities);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Saved opportunities could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSaved();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleSaveChange(opportunityId: string, saved: boolean) {
    if (saved) {
      return;
    }

    setOpportunities((current) =>
      current.filter((opportunity) => opportunity.id !== opportunityId),
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        {[0, 1].map((item) => (
          <div
            key={item}
            className="h-72 animate-pulse rounded-lg border border-slate-200 bg-white"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <h2 className="text-xl font-semibold text-[#0F172A]">
          No saved opportunities
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Saved opportunities will appear here.
        </p>
        <Link
          href="/opportunities"
          className="mt-5 inline-flex h-10 items-center rounded-md bg-[#10B981] px-4 text-sm font-semibold text-white"
        >
          Browse opportunities
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {opportunities.map((opportunity) => (
        <OpportunityCard
          key={opportunity.id}
          opportunity={opportunity}
          onSaveChange={handleSaveChange}
        />
      ))}
    </div>
  );
}
