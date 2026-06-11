export const opportunityCategories = [
  { label: "Jobs", value: "job" },
  { label: "Internships", value: "internship" },
  { label: "Bounties", value: "bounty" },
  { label: "Grants", value: "grant" },
  { label: "Scholarships", value: "scholarship" },
  { label: "Fellowships", value: "fellowship" },
  { label: "Startup Programs", value: "startup_program" },
  { label: "Hackathons", value: "hackathon" },
] as const;

export const remoteStatuses = [
  { label: "Remote", value: "remote" },
  { label: "Hybrid", value: "hybrid" },
  { label: "On-site", value: "onsite" },
  { label: "Unknown", value: "unknown" },
] as const;

export const applicationStatuses = [
  { label: "Saved", value: "saved" },
  { label: "Applied", value: "applied" },
  { label: "Interviewing", value: "interviewing" },
  { label: "Offer received", value: "offer_received" },
  { label: "Rejected", value: "rejected" },
  { label: "Completed", value: "completed" },
] as const;

export type OpportunityCategory = (typeof opportunityCategories)[number]["value"];
export type RemoteStatus = (typeof remoteStatuses)[number]["value"];
export type ApplicationStatus = (typeof applicationStatuses)[number]["value"];
export type OpportunitySort = "newest" | "deadline";

export type OpportunityApplicationState = {
  id: string;
  status: ApplicationStatus;
};

export type Opportunity = {
  id: string;
  title: string;
  organization: string;
  category: OpportunityCategory;
  location: string | null;
  remoteStatus: RemoteStatus;
  deadline: string | null;
  sourceUrl: string;
  applyUrl: string | null;
  description: string;
  skills: string[];
  eligibility: unknown;
  salaryPrizeAmount: string | null;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  matchScore: number;
  isSaved: boolean;
  application: OpportunityApplicationState | null;
};

export type Application = {
  id: string;
  opportunityId: string;
  status: ApplicationStatus;
  appliedAt: string | null;
  nextStepAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  opportunity: Opportunity | null;
};

export type ResumeStatus = {
  uploaded: boolean;
  fileName: string | null;
  fileSizeBytes: number | null;
  uploadedAt: string | null;
};

export type DashboardData = {
  user: {
    id: string;
    email?: string;
  };
  profile: {
    fullName: string | null;
    preferredRoles: string[];
    experienceLevel: string | null;
    location: string | null;
    onboardingCompleted: boolean;
  };
  stats: {
    profileCompletionScore: number;
    totalOpportunities: number;
    savedOpportunities: number;
    applicationsTracked: number;
    resumeStatus: ResumeStatus;
  };
  recommendedOpportunities: Opportunity[];
  recentOpportunities: Opportunity[];
};
