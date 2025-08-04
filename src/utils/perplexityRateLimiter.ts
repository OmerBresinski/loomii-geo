/**
 * Rate limiter for Perplexity API calls with intelligent caching
 * Ensures we don't exceed 50 requests per minute (RPM) and caches results
 */

interface CacheEntry {
  domain: string | null;
  timestamp: number;
  companyName: string; // Original company name for logging
}

// Cache configuration
const CACHE_CONFIG = {
  maxSize: 10000,
  ttlHours: 24, // Cache entries expire after 24 hours
  cleanupPercentage: 0.2, // Remove 20% when full
};

interface CacheStats {
  hits: number;
  misses: number;
  totalLookups: number;
  cacheSize: number;
  hitRate: number;
}

class PerplexityRateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestsPerMinute = 45; // Set to 45 to be safe (under 50 limit)
  private minDelay = (60 * 1000) / this.requestsPerMinute; // ~1.33 seconds between requests
  private lastRequestTime = 0;
  
  // Cache for company domain lookups
  private cache = new Map<string, CacheEntry>();
  private maxCacheSize = CACHE_CONFIG.maxSize; // Limit cache size to prevent memory issues
  private cacheStats = {
    hits: 0,
    misses: 0,
    totalLookups: 0,
  };

  // Normalize company name for cache key
  private normalizeCacheKey(companyName: string): string {
    return companyName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Check if company domain is cached and not expired
  private getCachedDomain(companyName: string): CacheEntry | null {
    const cacheKey = this.normalizeCacheKey(companyName);
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      // Check if cache entry has expired
      const now = Date.now();
      const ageHours = (now - cached.timestamp) / (1000 * 60 * 60);
      
      if (ageHours > CACHE_CONFIG.ttlHours) {
        this.cache.delete(cacheKey);
        console.log(`    🕒 Cache EXPIRED for "${companyName}" (${Math.round(ageHours)}h old)`);
        this.cacheStats.misses++;
        this.cacheStats.totalLookups++;
        return null;
      }
      
      this.cacheStats.hits++;
      this.cacheStats.totalLookups++;
      const ageMinutes = Math.round(ageHours * 60);
      console.log(`    💾 Cache HIT for "${companyName}" -> ${cached.domain || 'null'} (${ageMinutes}m old)`);
      return cached;
    }
    
    this.cacheStats.misses++;
    this.cacheStats.totalLookups++;
    return null;
  }

  // Cache company domain result
  private setCachedDomain(companyName: string, domain: string | null): void {
    const cacheKey = this.normalizeCacheKey(companyName);
    
    // Manage cache size
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanupCache();
    }
    
    this.cache.set(cacheKey, {
      domain,
      timestamp: Date.now(),
      companyName, // Store original name for logging
    });
    
    console.log(`    💾 Cached domain for "${companyName}": ${domain || 'null'}`);
  }

  // Clean up oldest cache entries when cache is full
  private cleanupCache(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 20% of entries
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
    
    console.log(`🧹 Cleaned up ${toRemove} old cache entries`);
  }

  // Specialized method for company domain lookups with caching
  async lookupCompanyDomain(
    companyName: string,
    lookupFn: () => Promise<{ object: { domain: string | null } }>
  ): Promise<string | null> {
    // Check cache first
    const cached = this.getCachedDomain(companyName);
    if (cached) {
      return cached.domain;
    }

    // If not cached, add to queue and cache result
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await lookupFn();
          const domain = result.object.domain;
          
          // Cache the result
          this.setCachedDomain(companyName, domain);
          
          resolve(domain);
        } catch (error) {
          // Cache failed lookups as null to avoid retrying
          this.setCachedDomain(companyName, null);
          reject(error);
        }
      });
      this.process();
    });
  }

  // Generic add method (unchanged for backward compatibility)
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    console.log(`🔄 Starting rate-limited processing of ${this.queue.length} Perplexity requests...`);
    
    while (this.queue.length > 0) {
      const fn = this.queue.shift()!;
      
      // Calculate how long to wait based on last request
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      const waitTime = Math.max(0, this.minDelay - timeSinceLastRequest);
      
      if (waitTime > 0) {
        console.log(`⏳ Waiting ${Math.round(waitTime)}ms before next Perplexity request...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      try {
        console.log(`📡 Making Perplexity request (${this.queue.length} remaining)...`);
        await fn();
        this.lastRequestTime = Date.now();
      } catch (error) {
        console.error('❌ Rate-limited request failed:', error);
        // Continue processing other requests even if one fails
      }
    }
    
    this.processing = false;
    console.log('✅ Rate-limited processing completed');
  }

  // Get queue status and cache statistics for monitoring
  getStatus() {
    const hitRate = this.cacheStats.totalLookups > 0 
      ? Math.round((this.cacheStats.hits / this.cacheStats.totalLookups) * 100) 
      : 0;

    return {
      queueLength: this.queue.length,
      processing: this.processing,
      requestsPerMinute: this.requestsPerMinute,
      minDelayMs: this.minDelay,
      cache: {
        size: this.cache.size,
        maxSize: this.maxCacheSize,
        hits: this.cacheStats.hits,
        misses: this.cacheStats.misses,
        totalLookups: this.cacheStats.totalLookups,
        hitRate: `${hitRate}%`,
      },
    };
  }

  // Get detailed cache statistics
  getCacheStats(): CacheStats {
    const hitRate = this.cacheStats.totalLookups > 0 
      ? Math.round((this.cacheStats.hits / this.cacheStats.totalLookups) * 100) 
      : 0;

    return {
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      totalLookups: this.cacheStats.totalLookups,
      cacheSize: this.cache.size,
      hitRate: hitRate,
    };
  }

  // Clear cache (useful for testing or maintenance)
  clearCache(): void {
    this.cache.clear();
    this.cacheStats = { hits: 0, misses: 0, totalLookups: 0 };
    console.log('🧹 Cache cleared');
  }
}

// Create singleton instance
export const perplexityRateLimiter = new PerplexityRateLimiter();