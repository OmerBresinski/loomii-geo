/**
 * Cache monitoring and management utilities
 */

import { perplexityRateLimiter } from './perplexityRateLimiter';

export function logCacheStatistics(): void {
  const stats = perplexityRateLimiter.getCacheStats();
  const status = perplexityRateLimiter.getStatus();
  
  console.log('\n📊 PERPLEXITY CACHE STATISTICS');
  console.log('='.repeat(40));
  console.log(`💾 Cache Size: ${status.cache.size}/${status.cache.maxSize} entries`);
  console.log(`🎯 Total Lookups: ${stats.totalLookups}`);
  console.log(`✅ Cache Hits: ${stats.hits}`);
  console.log(`❌ Cache Misses: ${stats.misses}`);
  console.log(`📈 Hit Rate: ${stats.hitRate}%`);
  
  if (stats.totalLookups > 0) {
    const costSavings = Math.round((stats.hits / stats.totalLookups) * 100);
    console.log(`💰 Cost Savings: ~${costSavings}% fewer API calls`);
  }
  
  console.log('='.repeat(40));
}

export function clearCache(): void {
  perplexityRateLimiter.clearCache();
  console.log('✅ Perplexity cache cleared');
}

// CLI script functionality
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'stats':
    case 'status':
      logCacheStatistics();
      break;
      
    case 'clear':
      clearCache();
      break;
      
    default:
      console.log('Usage:');
      console.log('  npm run cache:stats    - Show cache statistics');
      console.log('  npm run cache:clear    - Clear cache');
      console.log('');
      console.log('Available commands:');
      console.log('  stats, status  - Display cache statistics');
      console.log('  clear         - Clear the cache');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}