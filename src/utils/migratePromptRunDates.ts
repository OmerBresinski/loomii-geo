import { prisma } from './database';
import { subDays } from 'date-fns';

export async function migratePromptRunDates(orgId?: string) {
  if (orgId) {
    console.log(`🔄 Starting prompt run date migration for organization: ${orgId}`);
  } else {
    console.log('🔄 Starting prompt run date migration for all organizations...');
  }

  // Get organizations based on whether orgId is provided
  const organizations = await prisma.organization.findMany({
    where: orgId ? { id: orgId } : undefined,
    include: {
      company: {
        include: {
          prompts: {
            include: {
              promptRuns: {
                orderBy: { id: 'asc' }
              }
            }
          }
        }
      }
    }
  });

  console.log(`Found ${organizations.length} organization${organizations.length !== 1 ? 's' : ''} to process`);

  if (organizations.length === 0) {
    console.log('No organizations found');
    return;
  }

  for (const org of organizations) {
    if (!org.company) {
      console.log(`⚠️  Organization ${org.name} has no associated company, skipping...`);
      continue;
    }

    console.log(`\n🏢 Processing organization: ${org.name} (${org.domain})`);

    // Get all prompt runs for this organization
    const allPromptRuns = org.company.prompts.flatMap(prompt => 
      prompt.promptRuns.map(run => ({ ...run, promptId: prompt.id }))
    );

    console.log(`  Found ${allPromptRuns.length} prompt runs to migrate`);

    if (allPromptRuns.length === 0) {
      console.log('  No prompt runs found for this organization');
      continue;
    }

    // Group runs by prompt to simulate daily job behavior
    const runsByPrompt = new Map<number, typeof allPromptRuns>();
    allPromptRuns.forEach(run => {
      if (!runsByPrompt.has(run.promptId)) {
        runsByPrompt.set(run.promptId, []);
      }
      runsByPrompt.get(run.promptId)!.push(run);
    });

    // Calculate how many days back we need based on the prompt with most runs
    const maxRunsPerPrompt = Math.max(...Array.from(runsByPrompt.values()).map(runs => runs.length));
    console.log(`  Found ${runsByPrompt.size} unique prompts with max ${maxRunsPerPrompt} runs each`);
    console.log(`  Distributing runs across the past ${maxRunsPerPrompt} days`);

    // For each day, assign one run per prompt (if available)
    for (let dayIndex = 0; dayIndex < maxRunsPerPrompt; dayIndex++) {
      const daysAgo = maxRunsPerPrompt - dayIndex - 1;
      const baseDate = subDays(new Date(), daysAgo);
      
      console.log(`\n  📅 Day ${dayIndex + 1} (${baseDate.toISOString().split('T')[0]}):`);

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

          console.log(`    ✅ Prompt ${promptId}: Run ${run.id} at ${newDate.toTimeString().split(' ')[0]}`);
        }
      }
    }

    console.log(`  🎉 Completed migration for ${org.name}`);
  }

  console.log(`\n🎉 ${orgId ? 'Organization' : 'All organizations'} prompt run date migration completed successfully!`);
  
  // Show overall summary
  const whereClause = orgId ? {
    prompt: {
      company: {
        organizationId: orgId
      }
    }
  } : {};
  
  const oldestRun = await prisma.promptRun.findFirst({
    where: whereClause,
    orderBy: { runAt: 'asc' },
  });
  const newestRun = await prisma.promptRun.findFirst({
    where: whereClause,
    orderBy: { runAt: 'desc' },
  });

  if (oldestRun && newestRun) {
    console.log(`📅 Overall date range: ${oldestRun.runAt.toISOString().split('T')[0]} to ${newestRun.runAt.toISOString().split('T')[0]}`);
  }
}

// Run if called directly
if (require.main === module) {
  // Get orgId from command line arguments
  const orgId = process.argv[2];
  
  if (orgId && orgId.startsWith('--')) {
    console.error('Usage: npm run migrate:dates [orgId]');
    console.error('Example: npm run migrate:dates');
    console.error('Example: npm run migrate:dates "org-uuid-here"');
    process.exit(1);
  }

  migratePromptRunDates(orgId)
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