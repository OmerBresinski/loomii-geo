import { prisma } from '@/utils/database';

async function debugFireberrySourceCount() {
  console.log('🔍 Debugging why Fireberry only has 4 sources...\n');

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

  console.log(`✅ Found Fireberry: ${fireberry.name} (${fireberry.domain})`);
  console.log(`   Company ID: ${fireberry.id}\n`);

  // Check the organization
  const org = await prisma.organization.findUnique({
    where: { id: fireberry.organizationId || '' },
  });
  
  console.log(`🏢 Organization: ${org?.name} (ID: ${org?.id})\n`);

  // Count prompts for this company
  const promptCount = await prisma.prompt.count({
    where: { 
      companyId: fireberry.id,
      isActive: true 
    }
  });
  console.log(`📝 Active prompts: ${promptCount}`);

  // Count prompt runs for this company (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const promptRunCount = await prisma.promptRun.count({
    where: {
      prompt: {
        companyId: fireberry.id
      },
      runAt: {
        gte: thirtyDaysAgo
      }
    }
  });
  console.log(`🏃 Prompt runs (last 30 days): ${promptRunCount}`);

  // Get all prompt runs with their sources
  const promptRuns = await prisma.promptRun.findMany({
    where: {
      prompt: {
        companyId: fireberry.id
      },
      runAt: {
        gte: thirtyDaysAgo
      }
    },
    include: {
      prompt: true,
      mentionDetails: {
        include: {
          sourceUrl: {
            include: {
              source: true
            }
          }
        }
      }
    }
  });

  console.log(`\n📊 Detailed prompt run analysis:`);
  console.log(`Total prompt runs found: ${promptRuns.length}\n`);

  // Count unique sources from prompt runs
  const allSources = new Set<string>();
  const sourcesWithMentions = new Set<string>();
  
  promptRuns.forEach((run, index) => {
    console.log(`${index + 1}. Prompt: "${run.prompt.text.substring(0, 50)}..."`);
    console.log(`   Run ID: ${run.id}, Date: ${run.runAt.toISOString()}`);
    console.log(`   Mention Details: ${run.mentionDetails.length}`);
    
    if (run.mentionDetails.length > 0) {
      const runSources = new Set<string>();
      run.mentionDetails.forEach(detail => {
        const domain = detail.sourceUrl.source.domain;
        allSources.add(domain);
        sourcesWithMentions.add(domain);
        runSources.add(domain);
      });
      console.log(`   Unique sources: ${runSources.size} (${Array.from(runSources).join(', ')})`);
    } else {
      console.log(`   ⚠️  No mention details found for this run`);
    }
    console.log('');
  });

  console.log(`\n📈 Summary:`);
  console.log(`Total unique sources mentioned: ${allSources.size}`);
  console.log(`Sources with mentions: ${sourcesWithMentions.size}`);
  console.log(`Sources: ${Array.from(allSources).sort().join(', ')}\n`);

  // Now let's check what the sources endpoint query would return
  console.log(`🔍 Testing sources endpoint query logic...\n`);

  const sources = await prisma.source.findMany({
    where: {
      urls: {
        some: {
          mentionDetails: {
            some: {
              promptRun: {
                prompt: {
                  companyId: fireberry.id,
                },
                runAt: {
                  gte: thirtyDaysAgo,
                },
              },
            },
          },
        },
      },
    },
    include: {
      urls: {
        include: {
          mentionDetails: {
            where: {
              promptRun: {
                prompt: {
                  companyId: fireberry.id,
                },
                runAt: {
                  gte: thirtyDaysAgo,
                },
              },
            },
            include: {
              company: true,
            },
          },
        },
      },
    },
  });

  console.log(`Sources returned by endpoint query: ${sources.length}`);
  sources.forEach((source, index) => {
    console.log(`${index + 1}. ${source.domain} (${source.name})`);
    console.log(`   URLs: ${source.urls.length}`);
    const totalMentions = source.urls.reduce((sum, url) => sum + url.mentionDetails.length, 0);
    console.log(`   Total mention details: ${totalMentions}`);
    console.log('');
  });

  // Check if there are sources without mention details
  console.log(`\n🔍 Checking for sources that might have been filtered out...\n`);
  
  const allSourcesFromRuns = await prisma.source.findMany({
    where: {
      urls: {
        some: {
          mentionDetails: {
            some: {
              promptRun: {
                prompt: {
                  companyId: fireberry.id
                }
              }
            }
          }
        }
      }
    }
  });

  console.log(`All sources that have mention details from Fireberry prompts: ${allSourcesFromRuns.length}`);
  allSourcesFromRuns.forEach(source => {
    console.log(`- ${source.domain} (${source.name})`);
  });
}

debugFireberrySourceCount().catch(console.error);