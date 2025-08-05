import { prisma } from '@/utils/database';

async function debugPromptRunDetails() {
  console.log('🔍 Debugging why most prompt runs have no mention details...\n');

  // Find Fireberry company
  const fireberry = await prisma.company.findFirst({
    where: {
      domain: { contains: 'fireberry', mode: 'insensitive' }
    }
  });

  if (!fireberry) {
    console.log('❌ Fireberry company not found');
    return;
  }

  // Get a few recent prompt runs with different statuses
  const promptRunsWithDetails = await prisma.promptRun.findMany({
    where: {
      prompt: { companyId: fireberry.id },
      mentionDetails: { some: {} }
    },
    take: 2,
    orderBy: { runAt: 'desc' },
    include: {
      prompt: true,
      mentionDetails: {
        include: {
          company: true,
          sourceUrl: {
            include: { source: true }
          }
        }
      }
    }
  });

  const promptRunsWithoutDetails = await prisma.promptRun.findMany({
    where: {
      prompt: { companyId: fireberry.id },
      mentionDetails: { none: {} }
    },
    take: 5,
    orderBy: { runAt: 'desc' },
    include: {
      prompt: true
    }
  });

  console.log(`✅ Prompt runs WITH mention details: ${promptRunsWithDetails.length}`);
  promptRunsWithDetails.forEach((run, index) => {
    console.log(`\n${index + 1}. Run ID: ${run.id} (${run.runAt.toISOString()})`);
    console.log(`   Prompt: "${run.prompt.text.substring(0, 60)}..."`);
    console.log(`   Response length: ${typeof run.responseRaw === 'string' ? run.responseRaw.length : JSON.stringify(run.responseRaw).length} chars`);
    console.log(`   Mention details: ${run.mentionDetails.length}`);
    
    if (run.mentionDetails.length > 0) {
      console.log(`   Companies found:`);
      const companies = [...new Set(run.mentionDetails.map(d => d.company.name))];
      companies.slice(0, 5).forEach(company => {
        console.log(`   - ${company}`);
      });
      if (companies.length > 5) {
        console.log(`   - ... and ${companies.length - 5} more`);
      }
    }
  });

  console.log(`\n❌ Prompt runs WITHOUT mention details: ${promptRunsWithoutDetails.length}`);
  promptRunsWithoutDetails.forEach((run, index) => {
    console.log(`\n${index + 1}. Run ID: ${run.id} (${run.runAt.toISOString()})`);
    console.log(`   Prompt: "${run.prompt.text.substring(0, 60)}..."`);
    console.log(`   Response type: ${typeof run.responseRaw}`);
    
    if (typeof run.responseRaw === 'string') {
      console.log(`   Response length: ${run.responseRaw.length} chars`);
      console.log(`   Response preview: "${run.responseRaw.substring(0, 200)}..."`);
    } else {
      console.log(`   Response (JSON): ${JSON.stringify(run.responseRaw).substring(0, 200)}...`);
    }
  });

  // Check if there are any CompanyMentions for these runs
  console.log(`\n🔍 Checking for CompanyMentions...\n`);
  
  const companyMentions = await prisma.companyMention.findMany({
    where: {
      promptRun: {
        prompt: { companyId: fireberry.id }
      }
    },
    include: {
      promptRun: true,
      company: true
    },
    take: 10,
    orderBy: { promptRun: { runAt: 'desc' } }
  });

  console.log(`Found ${companyMentions.length} company mentions`);
  companyMentions.forEach((mention, index) => {
    console.log(`${index + 1}. Run ID: ${mention.promptRunId}, Company: ${mention.company.name}, Sentiment: ${mention.sentiment}`);
  });

  // Check source urls
  console.log(`\n🔍 Checking recent SourceUrls...\n`);
  
  const recentSourceUrls = await prisma.sourceUrl.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      source: true,
      mentionDetails: {
        include: {
          promptRun: {
            include: {
              prompt: {
                include: { company: true }
              }
            }
          }
        }
      }
    }
  });

  console.log(`Found ${recentSourceUrls.length} recent source URLs`);
  recentSourceUrls.forEach((sourceUrl, index) => {
    const fireberryMentions = sourceUrl.mentionDetails.filter(
      d => d.promptRun.prompt.company.id === fireberry.id
    );
    
    console.log(`${index + 1}. ${sourceUrl.url}`);
    console.log(`   Source: ${sourceUrl.source.name} (${sourceUrl.source.domain})`);
    console.log(`   Total mention details: ${sourceUrl.mentionDetails.length}`);
    console.log(`   Fireberry mention details: ${fireberryMentions.length}`);
    console.log(`   Created: ${sourceUrl.createdAt.toISOString()}`);
    console.log('');
  });
}

debugPromptRunDetails().catch(console.error);