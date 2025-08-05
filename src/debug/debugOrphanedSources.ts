import { prisma } from '@/utils/database';

async function debugOrphanedSources() {
  console.log('🔍 Looking for sources that were created but have no MentionDetails...\n');

  // Find Fireberry company
  const fireberry = await prisma.company.findFirst({
    where: { domain: { contains: 'fireberry', mode: 'insensitive' } }
  });

  if (!fireberry) {
    console.log('❌ Fireberry company not found');
    return;
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Get ALL sources created in the last 30 days
  const allRecentSources = await prisma.source.findMany({
    where: {
      urls: {
        some: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      }
    },
    include: {
      urls: {
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        },
        include: {
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
      }
    }
  });

  console.log(`📊 Total sources with recent URLs: ${allRecentSources.length}\n`);

  // Categorize sources
  const sourcesWithFireberryMentions = [];
  const sourcesWithOtherMentions = [];
  const sourcesWithNoMentions = [];

  allRecentSources.forEach(source => {
    const allMentionDetails = source.urls.flatMap(url => url.mentionDetails);
    const fireberryMentionDetails = allMentionDetails.filter(
      detail => detail.promptRun.prompt.company.id === fireberry.id
    );
    const otherMentionDetails = allMentionDetails.filter(
      detail => detail.promptRun.prompt.company.id !== fireberry.id
    );

    if (fireberryMentionDetails.length > 0) {
      sourcesWithFireberryMentions.push({
        ...source,
        fireberryMentions: fireberryMentionDetails.length,
        otherMentions: otherMentionDetails.length
      });
    } else if (otherMentionDetails.length > 0) {
      sourcesWithOtherMentions.push({
        ...source,
        otherMentions: otherMentionDetails.length
      });
    } else {
      sourcesWithNoMentions.push(source);
    }
  });

  console.log(`✅ Sources with Fireberry mentions: ${sourcesWithFireberryMentions.length}`);
  sourcesWithFireberryMentions.forEach(source => {
    console.log(`   - ${source.domain} (${source.name}): ${source.fireberryMentions} Fireberry, ${source.otherMentions} other`);
  });

  console.log(`\n🔄 Sources with other company mentions: ${sourcesWithOtherMentions.length}`);
  sourcesWithOtherMentions.slice(0, 10).forEach(source => {
    console.log(`   - ${source.domain} (${source.name}): ${source.otherMentions} mentions`);
  });

  console.log(`\n❌ Sources with NO mentions: ${sourcesWithNoMentions.length}`);
  sourcesWithNoMentions.slice(0, 10).forEach(source => {
    console.log(`   - ${source.domain} (${source.name})`);
    console.log(`     URLs: ${source.urls.length}, Recent URLs: ${source.urls.filter(url => url.createdAt >= thirtyDaysAgo).length}`);
  });

  // Check specifically what the sources endpoint query would return
  console.log(`\n🔍 What sources endpoint query returns:\n`);
  
  const endpointSources = await prisma.source.findMany({
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
    }
  });

  console.log(`Sources returned by endpoint: ${endpointSources.length}`);
  endpointSources.forEach(source => {
    console.log(`   - ${source.domain} (${source.name})`);
  });

  // The key question: Are there sources being created but not getting MentionDetails?
  console.log(`\n🤔 Analysis:`);
  console.log(`Total recent sources: ${allRecentSources.length}`);
  console.log(`Sources with Fireberry mentions: ${sourcesWithFireberryMentions.length}`);
  console.log(`Sources with no mentions at all: ${sourcesWithNoMentions.length}`);
  console.log(`Sources returned by endpoint: ${endpointSources.length}`);
  
  if (sourcesWithNoMentions.length > 0) {
    console.log(`\n⚠️  ${sourcesWithNoMentions.length} sources were created but have NO mention details!`);
    console.log('This suggests the daily visibility job is creating sources but failing to create MentionDetails.');
  }
}

debugOrphanedSources().catch(console.error);