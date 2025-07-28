import { prisma } from '../utils/database';
import { runDailyVisibilityJob } from '../jobs/dailyVisibility';

async function testMentionsIntegration() {
  console.log('🧪 Testing mentions integration...');
  
  try {
    // Clear existing mentions for clean test
    await prisma.mention.deleteMany({});
    console.log('✅ Cleared existing mentions');

    // Count mentions before job
    const mentionsBeforeCount = await prisma.mention.count();
    console.log(`📊 Mentions before job: ${mentionsBeforeCount}`);

    // Run a subset of the daily job (just first company for testing)
    console.log('🚀 Running daily visibility job...');
    await runDailyVisibilityJob();

    // Count mentions after job
    const mentionsAfterCount = await prisma.mention.count();
    console.log(`📊 Mentions after job: ${mentionsAfterCount}`);

    // Show some sample mentions
    const sampleMentions = await prisma.mention.findMany({
      take: 3,
      include: {
        prompt: {
          select: { text: true }
        },
        aiProvider: {
          select: { name: true }
        },
        company: {
          select: { name: true, domain: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('\n📝 Sample mentions created:');
    for (const mention of sampleMentions) {
      console.log(`  🏢 ${mention.company.name} (${mention.company.domain})`);
      console.log(`  🤖 ${mention.aiProvider.name}`);
      console.log(`  📄 Prompt: "${mention.prompt.text}"`);
      console.log(`  💬 Content: "${mention.content.substring(0, 100)}..."`);
      console.log(`  📅 Created: ${mention.createdAt}`);
      console.log('  ---');
    }

    if (mentionsAfterCount > mentionsBeforeCount) {
      console.log('✅ SUCCESS: Mentions were created during the daily job!');
    } else {
      console.log('⚠️  WARNING: No new mentions were created. This might be expected if no companies were mentioned in the AI responses.');
    }

  } catch (error) {
    console.error('❌ Error testing mentions integration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testMentionsIntegration();
}

export { testMentionsIntegration };