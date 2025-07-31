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

// Request interface for creating a new prompt
export interface CreatePromptRequest {
  text: string; // The prompt text (10-500 characters)
  tagIds?: number[]; // Optional array of tag IDs to associate with the prompt
}

// Response interface for successful prompt creation
export interface CreatePromptResponse {
  promptId: number;
  text: string;
  isActive: boolean;
  createdAt: Date;
  tags: PromptTag[];
}

// Response interface for getting all available tags
export interface TagsResponse {
  tags: PromptTag[];
}

// Generic API error response
export interface ApiError {
  error: string;
  message?: string;
  details?: string | Array<{
    field: string;
    message: string;
  }>;
}

// Validation error details
export interface ValidationError {
  field: string;
  message: string;
}

// Prompt usage tracking for progress bar
export interface PromptUsageResponse {
  currentCount: number; // Current number of prompts
  maxLimit: number; // Maximum allowed prompts (20)
  remainingCount: number; // How many prompts can still be created
  usagePercentage: number; // Percentage used (0-100)
  canCreateMore: boolean; // Whether user can create more prompts
}

// Error response when prompt limit is exceeded
export interface PromptLimitError {
  error: 'Prompt limit exceeded';
  message: string;
  details: {
    currentCount: number;
    maxLimit: number;
  };
}