export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: string[];
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface TopicsQuery extends PaginationQuery {
  status?: boolean;
}

export interface CompetitorsQuery {
  // Add specific competitor filters if needed
}

export interface SourcesQuery {
  yaelOnly?: boolean;
}

export interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
}

// Prisma model types (these will be auto-generated, but we define them for reference)
export interface Topic {
  id: string;
  name: string;
  responseCount: number;
  visibility: number;
  sentimentPositive: number;
  sentimentNeutral: number;
  sentimentNegative: number;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
  prompts?: Prompt[];
}

export interface Prompt {
  id: string;
  text: string;
  responses: number;
  visibility: number;
  sentimentPositive: number;
  sentimentNeutral: number;
  sentimentNegative: number;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
  topicId: string;
  topic?: Topic;
  aiProviders?: AIProviderResponse[];
}

export enum AIProvider {
  ChatGPT = 'ChatGPT',
  Gemini = 'Gemini',
  Perplexity = 'Perplexity',
}

export enum InsightImpact {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export interface AIProviderResponse {
  id: string;
  company: string;
  provider: AIProvider;
  homepage: string;
  response: string;
  insightTitle: string;
  insightSummary: string;
  insightProposedActions: string[];
  insightImpact: InsightImpact;
  insightLinks: string[];
  sources: string[];
  companyMentions: string[];
  competitionMentions: string[];
  promptId: string;
  prompt?: Prompt;
}

export interface Competitor {
  id: string;
  name: string;
  rank: number;
  sentimentPositive: number;
  sentimentNeutral: number;
  sentimentNegative: number;
  visibility: number;
  visibilityChange: number;
  favicon?: string;
  createdAt: Date;
  updatedAt: Date;
  historyData?: CompetitorHistory[];
}

export interface CompetitorHistory {
  id: string;
  date: Date;
  visibility: number;
  competitorId: string;
  competitor?: Competitor;
}

export interface Source {
  id: string;
  source: string;
  baseUrl: string;
  yaelGroupMentions: number;
  competitionMentions: number;
  totalMentions: number;
  createdAt: Date;
  updatedAt: Date;
  details?: SourceDetail[];
}

export interface SourceDetail {
  id: string;
  url: string;
  yaelGroupMentions: number;
  competitionMentions: number;
  totalMentions: number;
  sourceId: string;
  source?: Source;
}

export interface CompetitorsResponse {
  competitors: Competitor[];
  competitorHistory: CompetitorHistory[];
} 