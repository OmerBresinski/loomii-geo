import { PrismaClient } from '@prisma/client';
import { clearDatabase } from './clear';
import { seedDatabase } from './seed';
import { runDailyVisibilityJob } from './dailyVisibility';

const prisma = new PrismaClient();

async function runTest() {
  console.log('--- Starting test for runDailyVisibilityJob ---');
  console.warn(
    'NOTE: This is an end-to-end test and will make REAL API calls.'
  );
  console.warn(
    'For a real test suite, these API calls should be mocked to avoid costs and non-determinism.'
  );

  try {
    // 1. Setup: Clear and seed the database
    console.log('\n[STEP 1] Setting up the database...');
    await clearDatabase();
    await seedDatabase();
    console.log('[STEP 1] Database setup complete.');

    // 2. Run: Execute the job
    console.log('\n[STEP 2] Running the daily visibility job...');
    await runDailyVisibilityJob();
    console.log('[STEP 2] Job finished.');

    // 3. Verify: Check the results
    console.log('\n[STEP 3] Verifying the results...');
    const promptRuns = await prisma.promptRun.findMany({
      include: {
        provider: true,
        prompt: true,
        companyMentions: {
          include: {
            company: true,
          },
        },
      },
    });

    console.log(`Found ${promptRuns.length} prompt runs.`);
    if (promptRuns.length > 0) {
      console.log('--- Verification Data ---');
      console.log(JSON.stringify(promptRuns, null, 2));
      console.log('-------------------------');
      console.log('VERIFICATION SUCCEEDED: Data was created in the database.');
    } else {
      console.error('VERIFICATION FAILED: No prompt runs were created.');
    }
  } catch (error) {
    console.error('\n--- TEST FAILED ---');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n--- Test finished ---');
  }
}

runTest();
