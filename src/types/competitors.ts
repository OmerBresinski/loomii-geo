// TypeScript interfaces for /competitors endpoint response

export interface Company {
  companyId: number;
  companyName: string;
  companyDomain: string;
  mentions: number;
  visibility: number; // Percentage (0-100)
  averageSentiment: number; // Range: -1 to +1
  promptCount: number; // Number of unique prompts this company was mentioned in
  isYourCompany: boolean; // True if this is the logged-in user's company
}

// For backward compatibility
export interface Competitor extends Omit<Company, 'isYourCompany'> {}

export interface CompetitorFilters {
  promptId?: number; // Filter by specific prompt ID
  tagIds?: number[]; // Filter by tag IDs (array of numbers)
  span: number; // Time span in days (default: 30)
}

export interface CompetitorSummary {
  totalCompetitors: number;
  averageVisibility: number; // YOUR company's average visibility across filtered prompts
  topCompetitor: Competitor | null; // The competitor with highest visibility
}

export interface CompetitorsResponse {
  companies: Company[]; // All companies including your own (sorted with your company first)
  totalPrompts: number; // Total prompts included in the analysis
  totalRuns: number; // Total prompt runs analyzed
  filters: CompetitorFilters; // Applied filters
  summary: CompetitorSummary;
}

// Query parameters for the endpoint
export interface CompetitorsQueryParams {
  promptId?: string; // Optional: Filter by specific prompt ID
  tagIds?: string; // Optional: Comma-separated tag IDs (e.g., "1,2,3")
  span?: string; // Optional: Time span in days (default: "30")
}