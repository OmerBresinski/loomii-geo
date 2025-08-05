import { prisma } from '@/utils/database';

async function debugFireberryMentions() {
  console.log('🔍 Debugging Fireberry mention attribution...\n');

  // Find Fireberry company
  const fireberry = await prisma.company.findFirst({
    where: {
      OR: [
        { name: { contains: 'Fireberry', mode: 'insensitive' } },
        { domain: { contains: 'fireberry', mode: 'insensitive' } }
      ]
    }
  });

  if (!fireberry) {
    console.log('❌ Fireberry company not found');
    return;
  }

  console.log(`✅ Found Fireberry: ${fireberry.name} (${fireberry.domain})\n`);

  // Get all mention details for sources that Fireberry appears in
  const fireberryMentionDetails = await prisma.mentionDetail.findMany({
    where: {
      promptRun: {
        runAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        }
      }
    },
    include: {
      company: true,
      sourceUrl: {
        include: {
          source: true
        }
      },
      promptRun: {
        include: {
          prompt: {
            include: {
              company: true
            }
          }
        }
      }
    }
  });

  // Group by source domain
  const sourceData = new Map();

  fireberryMentionDetails.forEach(detail => {
    const domain = detail.sourceUrl.source.domain;
    const isFireberryOrg = detail.company.id === fireberry.id;
    const isFireberryPrompt = detail.promptRun.prompt.company.id === fireberry.id;
    
    if (!sourceData.has(domain)) {
      sourceData.set(domain, {
        domain,
        sourceName: detail.sourceUrl.source.name,
        totalMentions: 0,
        fireberryMentions: 0,
        competitorMentions: 0,
        fireberryPrompts: 0,
        nonFireberryPrompts: 0,
        mentionDetails: []
      });
    }

    const data = sourceData.get(domain);
    data.totalMentions++;
    
    if (isFireberryOrg) {
      data.fireberryMentions++;
    } else {
      data.competitorMentions++;
    }

    if (isFireberryPrompt) {
      data.fireberryPrompts++;
    } else {
      data.nonFireberryPrompts++;
    }

    data.mentionDetails.push({
      companyName: detail.company.name,
      companyDomain: detail.company.domain,
      isFireberryCompany: isFireberryOrg,
      isFireberryPrompt,
      sourceUrl: detail.sourceUrl.url,
      promptText: detail.promptRun.prompt.text.substring(0, 100) + '...'
    });
  });

  // Sort by total mentions and display results
  const sortedSources = Array.from(sourceData.values())
    .filter(source => source.fireberryPrompts > 0) // Only sources from Fireberry's prompts
    .sort((a, b) => b.totalMentions - a.totalMentions);

  console.log(`📊 Analysis of ${sortedSources.length} sources from Fireberry's prompts:\n`);

  sortedSources.slice(0, 10).forEach((source, index) => {
    console.log(`${index + 1}. ${source.domain} (${source.sourceName})`);
    console.log(`   Total mentions: ${source.totalMentions}`);
    console.log(`   Fireberry mentions: ${source.fireberryMentions}`);
    console.log(`   Competitor mentions: ${source.competitorMentions}`);
    console.log(`   Fireberry prompts: ${source.fireberryPrompts}`);
    
    // Show a few example companies mentioned
    const companies = [...new Set(source.mentionDetails.map(d => d.companyName))];
    console.log(`   Companies mentioned: ${companies.slice(0, 5).join(', ')}${companies.length > 5 ? '...' : ''}`);
    
    console.log('');
  });

  // Check specific fireberry.com domain
  const fireberryDotCom = sortedSources.find(s => s.domain.includes('fireberry'));
  if (fireberryDotCom) {
    console.log('🔍 Detailed analysis of fireberry.com domain:');
    console.log(`   Total mentions: ${fireberryDotCom.totalMentions}`);
    console.log(`   Fireberry mentions: ${fireberryDotCom.fireberryMentions}`);
    console.log(`   Competitor mentions: ${fireberryDotCom.competitorMentions}`);
    console.log('\n   All mention details:');
    
    fireberryDotCom.mentionDetails.forEach((detail, index) => {
      console.log(`   ${index + 1}. Company: ${detail.companyName} (${detail.companyDomain})`);
      console.log(`      Is Fireberry: ${detail.isFireberryCompany}`);
      console.log(`      Source URL: ${detail.sourceUrl}`);
      console.log(`      Prompt: ${detail.promptText}`);
      console.log('');
    });
  }

  // Check how Fireberry company matching works
  console.log('\n🔍 Checking company domain matching logic:');
  console.log(`Fireberry company domain: "${fireberry.domain}"`);
  
  // Find all companies with similar names
  const similarCompanies = await prisma.company.findMany({
    where: {
      OR: [
        { name: { contains: 'fireberry', mode: 'insensitive' } },
        { name: { contains: 'fire', mode: 'insensitive' } },
        { domain: { contains: 'fireberry', mode: 'insensitive' } }
      ]
    }
  });

  console.log('\nSimilar companies in database:');
  similarCompanies.forEach(company => {
    console.log(`- ${company.name} (${company.domain}) [ID: ${company.id}]`);
  });
}

debugFireberryMentions().catch(console.error);