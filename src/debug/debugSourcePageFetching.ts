import { prisma } from '@/utils/database';

async function debugSourcePageFetching() {
  console.log('🔍 Debugging source page fetching issues...\n');

  // Get a recent prompt run that should have sources but has no mention details
  const promptRunWithoutDetails = await prisma.promptRun.findFirst({
    where: {
      prompt: {
        company: {
          domain: { contains: 'fireberry', mode: 'insensitive' }
        }
      },
      mentionDetails: { none: {} }
    },
    orderBy: { runAt: 'desc' },
    include: {
      prompt: {
        include: { company: true }
      }
    }
  });

  if (!promptRunWithoutDetails) {
    console.log('❌ No prompt run without mention details found');
    return;
  }

  console.log(`📝 Prompt Run ID: ${promptRunWithoutDetails.id}`);
  console.log(`📅 Run Date: ${promptRunWithoutDetails.runAt.toISOString()}`);
  console.log(`🏢 Company: ${promptRunWithoutDetails.prompt.company.name}`);
  console.log(`📋 Prompt: "${promptRunWithoutDetails.prompt.text.substring(0, 100)}..."`);
  console.log(`📊 Response Length: ${typeof promptRunWithoutDetails.responseRaw === 'string' ? promptRunWithoutDetails.responseRaw.length : JSON.stringify(promptRunWithoutDetails.responseRaw).length} chars\n`);

  // Check if any sources were created for this prompt run
  const sources = await prisma.sourceUrl.findMany({
    where: {
      mentionDetails: {
        some: {
          promptRunId: promptRunWithoutDetails.id
        }
      }
    },
    include: {
      source: true
    }
  });

  console.log(`🔗 Sources linked to this prompt run: ${sources.length}`);

  if (sources.length === 0) {
    // Check what sources were created around this time
    const timeWindow = new Date(promptRunWithoutDetails.runAt.getTime() - 10 * 60 * 1000); // 10 minutes before
    const timeWindowAfter = new Date(promptRunWithoutDetails.runAt.getTime() + 10 * 60 * 1000); // 10 minutes after

    const sourcesAroundTime = await prisma.sourceUrl.findMany({
      where: {
        createdAt: {
          gte: timeWindow,
          lte: timeWindowAfter
        }
      },
      include: {
        source: true
      },
      take: 10
    });

    console.log(`🕐 Sources created around this time (±10 min): ${sourcesAroundTime.length}`);
    sourcesAroundTime.forEach((source, index) => {
      console.log(`${index + 1}. ${source.url} (${source.source.name})`);
    });
  }

  // Let's manually test fetching a few known sources and check if company name appears
  const testSources = [
    'https://www.fireberry.com/he',
    'https://powerlink.co.il',
    'https://israelcrm.co.il'
  ];

  console.log(`\n🧪 Manual source page fetching test...\n`);

  for (const sourceUrl of testSources) {
    console.log(`Testing: ${sourceUrl}`);
    try {
      const response = await fetch(sourceUrl, {
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) {
        console.log(`  ❌ HTTP ${response.status}: ${response.statusText}`);
        continue;
      }

      const text = await response.text();
      console.log(`  ✅ Fetched ${text.length} characters`);
      
      // Test if it contains various company names
      const companies = ['fireberry', 'powerlink', 'zoho', 'hubspot', 'salesforce'];
      const found = companies.filter(company => 
        text.toLowerCase().includes(company.toLowerCase())
      );
      
      if (found.length > 0) {
        console.log(`  🎯 Found companies: ${found.join(', ')}`);
      } else {
        console.log(`  ❌ No target companies found in content`);
      }
      
      // Show a snippet of the content
      const snippet = text.substring(0, 200).replace(/\s+/g, ' ').trim();
      console.log(`  📄 Content preview: "${snippet}..."`);
      
    } catch (error) {
      console.log(`  ❌ Fetch failed: ${error.message}`);
    }
    console.log('');
  }

  // Check the actual response content from the prompt run
  console.log(`\n📋 AI Response Analysis...\n`);
  const response = typeof promptRunWithoutDetails.responseRaw === 'string' 
    ? promptRunWithoutDetails.responseRaw 
    : JSON.stringify(promptRunWithoutDetails.responseRaw);
  
  console.log(`Response preview: "${response.substring(0, 500)}..."`);
  
  // Check if response mentions company names
  const companies = ['fireberry', 'powerlink', 'zoho', 'hubspot', 'salesforce', 'crm'];
  const mentionedCompanies = companies.filter(company => 
    response.toLowerCase().includes(company.toLowerCase())
  );
  
  console.log(`Companies mentioned in response: ${mentionedCompanies.join(', ')}`);
}

debugSourcePageFetching().catch(console.error);