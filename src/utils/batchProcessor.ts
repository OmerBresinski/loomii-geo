/**
 * Process items in batches with delays to respect rate limits
 */

export async function processInBatches<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
  delayBetweenBatches: number = 15000 // 15 seconds
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)} (${batch.length} items)`);
    
    // Process batch sequentially with small delays
    for (const item of batch) {
      try {
        const result = await processor(item);
        results.push(result);
        
        // Small delay between items in batch (1.5 seconds for 40 RPM)
        if (batch.indexOf(item) < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } catch (error) {
        console.error('Batch processing error:', error);
        // Continue with next item
      }
    }
    
    // Delay between batches if not the last batch
    if (i + batchSize < items.length) {
      console.log(`⏳ Waiting ${delayBetweenBatches}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  return results;
}