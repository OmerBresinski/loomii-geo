export interface PromptTag {
  id: number;
  label: string;
  color: string;
}

export interface PromptData {
  promptId: number;
  text: string;
  visibility: number;
  topCompetitorDomains: string[];
  tags: PromptTag[];
  createdAt: string;
  isActive: boolean;
  totalRuns: number;
}

export type PromptsResponse = PromptData[];

// Optional: Query parameters interface for the endpoint
export interface PromptsQueryParams {
  days?: number;
}