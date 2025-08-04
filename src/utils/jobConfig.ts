/**
 * Configuration for daily job rate limiting and processing
 */

export const jobConfig = {
  // Perplexity settings
  perplexity: {
    enabled: process.env.PERPLEXITY_ENABLED !== 'false',
    requestsPerMinute: parseInt(process.env.PERPLEXITY_REQUESTS_PER_MINUTE || '45'),
    fallbackToGoogle: process.env.PERPLEXITY_FALLBACK_TO_GOOGLE === 'true',
  },
  
  // Daily job limits
  dailyJob: {
    maxCompaniesPerRun: parseInt(process.env.DAILY_JOB_MAX_COMPANIES_PER_RUN || '100'),
    delayBetweenCompanies: parseInt(process.env.DAILY_JOB_DELAY_BETWEEN_COMPANIES || '0'),
    batchSize: parseInt(process.env.DAILY_JOB_BATCH_SIZE || '10'),
  },
  
  // Retry settings
  retry: {
    maxRetries: 3,
    baseDelay: 2000, // 2 seconds
    maxDelay: 30000, // 30 seconds
  }
};