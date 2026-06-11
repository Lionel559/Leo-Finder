export type OpportunityType =
  | "job"
  | "internship"
  | "bounty"
  | "scholarship"
  | "grant"
  | "fellowship"
  | "startup_program"
  | "hackathon"
  | "competition"
  | "event"
  | "other";

export type OpportunityStatus = "draft" | "open" | "closed" | "archived";

export type Opportunity = {
  id: string;
  title: string;
  organization: string;
  description: string;
  url: string;
  type: OpportunityType;
  status: OpportunityStatus;
  location?: string;
  isRemote?: boolean;
  deadline?: string;
  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
    interval?: "hour" | "month" | "year";
  };
  tags: string[];
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type UserProfile = {
  id: string;
  email: string;
  fullName?: string;
  headline?: string;
  location?: string;
  skills: string[];
  interests: string[];
  resumeUrl?: string;
  telegramChatId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ResumeAnalysis = {
  id: string;
  userId: string;
  summary: string;
  skills: string[];
  strengths: string[];
  gaps: string[];
  experienceYears?: number;
  education: string[];
  preferredRoles: string[];
  industries: string[];
  seniority?: "entry" | "mid" | "senior" | "executive";
  createdAt: string;
};

export type MatchScore = {
  userId: string;
  opportunityId: string;
  overallScore: number;
  confidence: number;
  reasons: string[];
  missingRequirements: string[];
  createdAt: string;
};

export type ValidationErrors = Record<string, string[]>;

export type ApiResponse<TData = unknown> =
  | {
      success: true;
      message: string;
      data?: TData;
    }
  | {
      success: false;
      message: string;
      error?: {
        code?: string;
        details?: unknown;
      };
      errors?: ValidationErrors;
    };
