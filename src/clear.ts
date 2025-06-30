import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const main = async () => {
  console.log('🧹 Starting database clearing...');

  try {
    // Clear data in the correct order to avoid foreign key constraint issues
    console.log('🗑️  Deleting AI provider responses...');
    await prisma.aIProviderResponse.deleteMany();

    console.log('🗑️  Deleting prompts...');
    await prisma.prompt.deleteMany();

    console.log('🗑️  Deleting topics...');
    await prisma.topic.deleteMany();

    console.log('🗑️  Deleting competitor history...');
    await prisma.competitorHistory.deleteMany();

    console.log('🗑️  Deleting competitors...');
    await prisma.competitor.deleteMany();

    console.log('🗑️  Deleting source details...');
    await prisma.sourceDetail.deleteMany();

    console.log('🗑️  Deleting sources...');
    await prisma.source.deleteMany();

    console.log('✅ Database cleared successfully!');
    console.log('💡 You can now run "npm run db:seed" to add fresh data.');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
};

main()
  .catch(e => {
    console.error('❌ Error during clearing:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
