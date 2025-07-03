import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function clearDatabase() {
  console.log('Clearing database...');

  // The order is important to avoid foreign key constraint violations
  const tableNames = [
    'MentionDetail',
    'CompanyMention',
    'SourceUrl',
    'PromptRun',
    'Prompt',
    'Topic',
    'Company',
    'Source',
    'AIProvider',
  ];

  await prisma.$transaction(
    tableNames.map(table =>
      prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`
      )
    )
  );

  console.log('Database cleared successfully.');
}

// Allow running the script directly
if (require.main === module) {
  clearDatabase()
    .catch(e => {
      console.error('An error occurred while clearing the database:');
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
