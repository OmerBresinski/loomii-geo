import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('Clearing database...');

  // The order is important to avoid foreign key constraint violations
  await prisma.mentionDetail.deleteMany({});
  await prisma.companyMention.deleteMany({});
  await prisma.sourceUrl.deleteMany({});
  await prisma.source.deleteMany({});
  await prisma.promptRun.deleteMany({});
  await prisma.aIProvider.deleteMany({});
  await prisma.prompt.deleteMany({});
  await prisma.topic.deleteMany({});
  await prisma.company.deleteMany({});

  console.log('Database cleared successfully.');
}

clearDatabase()
  .catch(e => {
    console.error('An error occurred while clearing the database:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
