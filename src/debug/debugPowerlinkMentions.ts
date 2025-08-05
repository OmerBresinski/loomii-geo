import { prisma } from '@/utils/database';

async function debugPowerlinkMentions() {
  console.log('🔍 Debugging PowerLink mentions breakdown...\n');

  // Find Fireberry company
  const fireberry = await prisma.company.findFirst({
    where: { domain: { contains: 'fireberry', mode: 'insensitive' } }
  });

  if (!fireberry) {
    console.log('❌ Fireberry company not found');
    return;
  }

  // Get PowerLink source with all its mention details
  const powerlinkSource = await prisma.source.findFirst({
    where: { domain: 'powerlink.co.il' },
    include: {
      urls: {
        include: {
          mentionDetails: {
            where: {
              promptRun: {
                prompt: {
                  companyId: fireberry.id
                },
                runAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
              }
            },
            include: {
              company: true,
              promptRun: {
                include: {
                  prompt: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!powerlinkSource) {
    console.log('❌ PowerLink source not found');
    return;
  }

  console.log(`📊 PowerLink Source Analysis:`);
  console.log(`Domain: ${powerlinkSource.domain}`);
  console.log(`Name: ${powerlinkSource.name}`);
  console.log(`URLs: ${powerlinkSource.urls.length}\n`);

  let totalMentions = 0;
  let fireberryMentions = 0;
  let competitorMentions = 0;

  powerlinkSource.urls.forEach((url, urlIndex) => {
    console.log(`URL ${urlIndex + 1}: ${url.url}`);
    console.log(`  Mention Details: ${url.mentionDetails.length}`);
    
    const urlFireberryMentions = url.mentionDetails.filter(d => d.company.id === fireberry.id).length;
    const urlCompetitorMentions = url.mentionDetails.length - urlFireberryMentions;
    
    totalMentions += url.mentionDetails.length;
    fireberryMentions += urlFireberryMentions;
    competitorMentions += urlCompetitorMentions;
    
    console.log(`  Fireberry mentions: ${urlFireberryMentions}`);
    console.log(`  Competitor mentions: ${urlCompetitorMentions}`);
    
    // Show what companies are mentioned
    const companies = [...new Set(url.mentionDetails.map(d => d.company.name))];
    console.log(`  Companies: ${companies.join(', ')}`);
    
    // Show which prompt runs these came from
    const promptRuns = [...new Set(url.mentionDetails.map(d => d.promptRunId))];
    console.log(`  From ${promptRuns.length} different prompt runs`);
    
    if (url.mentionDetails.length > 0) {
      console.log(`  Example prompt: "${url.mentionDetails[0].promptRun.prompt.text.substring(0, 60)}..."`);
    }
    console.log('');
  });

  console.log(`📈 Totals:`);
  console.log(`Total mentions: ${totalMentions}`);
  console.log(`Fireberry mentions: ${fireberryMentions}`);
  console.log(`Competitor mentions: ${competitorMentions}`);

  // Let's see ALL the companies mentioned for PowerLink
  console.log(`\n🏢 All companies mentioned on PowerLink domain:`);
  const allMentionDetails = powerlinkSource.urls.flatMap(url => url.mentionDetails);
  const companyBreakdown = new Map();
  
  allMentionDetails.forEach(detail => {
    const companyName = detail.company.name;
    if (!companyBreakdown.has(companyName)) {
      companyBreakdown.set(companyName, 0);
    }
    companyBreakdown.set(companyName, companyBreakdown.get(companyName) + 1);
  });

  // Sort by mention count
  const sortedCompanies = Array.from(companyBreakdown.entries())
    .sort((a, b) => b[1] - a[1]);

  sortedCompanies.forEach(([company, count]) => {
    console.log(`  ${company}: ${count} mentions`);
  });

  // Key question: Are these 32 mentions from 32 different prompt runs, or duplicates?
  console.log(`\n🔍 Prompt Run Analysis:`);
  const promptRunIds = [...new Set(allMentionDetails.map(d => d.promptRunId))];
  console.log(`Unique prompt runs: ${promptRunIds.length}`);
  console.log(`Total mention details: ${allMentionDetails.length}`);
  console.log(`Ratio: ${(allMentionDetails.length / promptRunIds.length).toFixed(1)} mentions per prompt run`);

  if (promptRunIds.length <= 5) {
    console.log(`\nPrompt run details:`);
    for (const runId of promptRunIds) {
      const runMentions = allMentionDetails.filter(d => d.promptRunId === runId);
      const run = runMentions[0].promptRun;
      console.log(`Run ${runId}: ${runMentions.length} mentions`);
      console.log(`  Prompt: "${run.prompt.text.substring(0, 60)}..."`);
      console.log(`  Companies: ${runMentions.map(d => d.company.name).join(', ')}`);
    }
  }
}

debugPowerlinkMentions().catch(console.error);