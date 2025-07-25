import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🗑️  Clearing database...');

  // The order is important to avoid foreign key constraint violations
  // Start with most dependent tables first
  console.log('  Clearing mention details...');
  await prisma.mentionDetail.deleteMany({});
  
  console.log('  Clearing company mentions...');
  await prisma.companyMention.deleteMany({});
  
  console.log('  Clearing prompt runs...');
  await prisma.promptRun.deleteMany({});
  
  console.log('  Clearing prompt tags...');
  await prisma.promptTag.deleteMany({});
  
  console.log('  Clearing prompts...');
  await prisma.prompt.deleteMany({});
  
  console.log('  Clearing tags...');
  await prisma.tag.deleteMany({});
  
  console.log('  Clearing source URLs...');
  await prisma.sourceUrl.deleteMany({});
  
  console.log('  Clearing sources...');
  await prisma.source.deleteMany({});
  
  console.log('  Clearing AI providers...');
  await prisma.aIProvider.deleteMany({});
  
  console.log('  Clearing companies...');
  await prisma.company.deleteMany({});
  
  console.log('  Clearing organizations...');
  await prisma.organization.deleteMany({});

  console.log('✅ Database cleared successfully - all tables are now empty.');
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
