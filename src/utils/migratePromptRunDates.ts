import { prisma } from './database';
import { subDays } from 'date-fns';

export async function migratePromptRunDates() {
  console.log('🔄 Starting prompt run date migration...');

  // Get all prompt runs with their prompt info, ordered by creation
  const promptRuns = await prisma.promptRun.findMany({
    include: {
      prompt: true,
    },
    orderBy: {
      id: 'asc',
    },
  });

  console.log(`Found ${promptRuns.length} prompt runs to migrate`);

  if (promptRuns.length === 0) {
    console.log('No prompt runs found to migrate');
    return;
  }

  // Group runs by prompt to simulate daily job behavior
  const runsByPrompt = new Map<number, typeof promptRuns>();
  promptRuns.forEach(run => {
    if (!runsByPrompt.has(run.promptId)) {
      runsByPrompt.set(run.promptId, []);
    }
    runsByPrompt.get(run.promptId)!.push(run);
  });

  // Calculate how many days back we need based on the prompt with most runs
  const maxRunsPerPrompt = Math.max(...Array.from(runsByPrompt.values()).map(runs => runs.length));
  console.log(`Found ${runsByPrompt.size} unique prompts with max ${maxRunsPerPrompt} runs each`);
  console.log(`Distributing runs across the past ${maxRunsPerPrompt} days`);

  // For each day, assign one run per prompt (if available)
  for (let dayIndex = 0; dayIndex < maxRunsPerPrompt; dayIndex++) {
    const daysAgo = maxRunsPerPrompt - dayIndex - 1;
    const baseDate = subDays(new Date(), daysAgo);
    
    console.log(`\n📅 Day ${dayIndex + 1} (${baseDate.toISOString().split('T')[0]}):`);

    for (const [promptId, runs] of runsByPrompt.entries()) {
      if (runs.length > dayIndex) {
        const run = runs[dayIndex];
        
        // Set random time between 9 AM and 5 PM for this day
        const randomHour = Math.floor(Math.random() * 8) + 9;
        const randomMinute = Math.floor(Math.random() * 60);
        const randomSecond = Math.floor(Math.random() * 60);
        
        const newDate = new Date(baseDate);
        newDate.setHours(randomHour, randomMinute, randomSecond, 0);

        await prisma.promptRun.update({
          where: { id: run.id },
          data: {
            runAt: newDate,
          },
        });

        console.log(`  ✅ Prompt ${promptId}: Run ${run.id} at ${newDate.toTimeString().split(' ')[0]}`);
      }
    }
  }

  console.log('\n🎉 Prompt run date migration completed successfully!');
  
  // Show summary
  const oldestRun = await prisma.promptRun.findFirst({
    orderBy: { runAt: 'asc' },
  });
  const newestRun = await prisma.promptRun.findFirst({
    orderBy: { runAt: 'desc' },
  });

  if (oldestRun && newestRun) {
    console.log(`📅 Date range: ${oldestRun.runAt.toISOString().split('T')[0]} to ${newestRun.runAt.toISOString().split('T')[0]}`);
  }
}

// Run if called directly
if (require.main === module) {
  migratePromptRunDates()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}