import { errorResponse, successResponse } from "@/lib/api";
import { AuthError } from "@/lib/auth";
import {
  opportunityCategories,
  remoteStatuses,
  type OpportunitySort,
} from "@/lib/opportunities";
import {
  filterPublishedRows,
  formatOpportunity,
  getOpportunityViewerContext,
  opportunitySelect,
  type DbOpportunity,
} from "@/lib/opportunities/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store",
};

const categoryValues = new Set<string>(
  opportunityCategories.map((item) => item.value),
);
const remoteStatusValues = new Set<string>(
  remoteStatuses.map((item) => item.value),
);

function getListParam(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getLimit(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return Math.max(1, Math.min(Math.floor(parsed), 100));
}

function getSort(value: string | null): OpportunitySort {
  if (value === "deadline" || value === "salary_prize_amount") {
    return value;
  }

  return "newest";
}

function includesKeyword(row: DbOpportunity, keyword: string) {
  if (!keyword) {
    return true;
  }

  const haystack = [
    row.title,
    row.organization,
    row.category,
    row.location ?? "",
    row.description,
    ...(row.skills ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(keyword);
}

function includesSkills(row: DbOpportunity, skills: string[]) {
  if (skills.length === 0) {
    return true;
  }

  const rowSkills = new Set((row.skills ?? []).map((skill) => skill.toLowerCase()));

  return skills.some((skill) => rowSkills.has(skill));
}

function getSalaryPrizeSortValue(value: string | null) {
  if (!value) {
    return 0;
  }

  const match = value.match(/[\d,.]+/);

  if (!match) {
    return 0;
  }

  const parsed = Number(match[0].replace(/,/g, ""));

  return Number.isFinite(parsed) ? parsed : 0;
}

function sortRows(rows: DbOpportunity[], sort: OpportunitySort) {
  return [...rows].sort((a, b) => {
    if (sort === "deadline") {
      const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;

      return aTime - bTime;
    }

    if (sort === "salary_prize_amount") {
      return (
        getSalaryPrizeSortValue(b.salary_prize_amount) -
        getSalaryPrizeSortValue(a.salary_prize_amount)
      );
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const context = await getOpportunityViewerContext(supabase);
    const url = new URL(request.url);
    const keyword = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const category = url.searchParams.get("category");
    const remoteStatus =
      url.searchParams.get("remote_status") ??
      url.searchParams.get("remoteStatus");
    const location = (url.searchParams.get("location") ?? "").trim().toLowerCase();
    const skills = getListParam(url.searchParams.get("skills"));
    const sort = getSort(url.searchParams.get("sort"));
    const limit = getLimit(url.searchParams.get("limit"));
    const recommended = url.searchParams.get("recommended") === "true";
    const { data, error } = await supabase
      .from("opportunities")
      .select(opportunitySelect)
      .eq("status", "published")
      .limit(250);

    if (error) {
      return errorResponse(
        "Opportunities could not be loaded.",
        500,
        { code: "OPPORTUNITIES_LOAD_FAILED", details: error.message },
        noStoreHeaders,
      );
    }

    let rows = filterPublishedRows((data ?? []) as DbOpportunity[]);

    rows = rows.filter((row) => {
      if (!includesKeyword(row, keyword)) {
        return false;
      }

      if (category && categoryValues.has(category) && row.category !== category) {
        return false;
      }

      if (
        remoteStatus &&
        remoteStatusValues.has(remoteStatus) &&
        row.remote_status !== remoteStatus
      ) {
        return false;
      }

      if (location && !(row.location ?? "").toLowerCase().includes(location)) {
        return false;
      }

      return includesSkills(row, skills);
    });

    let opportunities = sortRows(rows, sort).map((row) =>
      formatOpportunity(row, context),
    );

    if (recommended) {
      opportunities = opportunities.sort((a, b) => b.matchScore - a.matchScore);
    }

    return successResponse(
      "Opportunities loaded",
      {
        opportunities: opportunities.slice(0, limit),
        total: opportunities.length,
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
