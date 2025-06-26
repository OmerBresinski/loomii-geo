import { PrismaClient, AIProvider, InsightImpact } from '@prisma/client';

const prisma = new PrismaClient();

const main = async () => {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  await prisma.aIProviderResponse.deleteMany();
  await prisma.prompt.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.competitorHistory.deleteMany();
  await prisma.competitor.deleteMany();
  await prisma.sourceDetail.deleteMany();
  await prisma.source.deleteMany();

  console.log('🗑️  Cleared existing data');

  // Create Topics
  const topics = await Promise.all([
    prisma.topic.create({
      data: {
        name: 'Salesforce',
        responseCount: 142,
        visibility: 87.5,
        sentimentPositive: 68.2,
        sentimentNeutral: 24.8,
        sentimentNegative: 7.0,
        status: true,
      },
    }),
    prisma.topic.create({
      data: {
        name: 'ERP',
        responseCount: 89,
        visibility: 72.3,
        sentimentPositive: 55.6,
        sentimentNeutral: 32.1,
        sentimentNegative: 12.3,
        status: true,
      },
    }),
    prisma.topic.create({
      data: {
        name: 'Cloud Cost Management & FinOps',
        responseCount: 156,
        visibility: 91.2,
        sentimentPositive: 78.4,
        sentimentNeutral: 18.9,
        sentimentNegative: 2.7,
        status: true,
      },
    }),
  ]);

  console.log('✅ Created topics');

  // Create Prompts and AI Provider Responses
  const promptsData = [
    {
      topicName: 'Salesforce',
      prompts: [
        {
          text: 'What are the best alternatives to Salesforce for small businesses?',
          responses: 24,
          visibility: 85.2,
          sentimentPositive: 72.1,
          sentimentNeutral: 21.4,
          sentimentNegative: 6.5,
        },
        {
          text: 'How does Salesforce pricing compare to competitors?',
          responses: 31,
          visibility: 89.7,
          sentimentPositive: 58.3,
          sentimentNeutral: 35.2,
          sentimentNegative: 6.5,
        },
        {
          text: 'Salesforce implementation best practices',
          responses: 18,
          visibility: 76.8,
          sentimentPositive: 81.2,
          sentimentNeutral: 16.8,
          sentimentNegative: 2.0,
        },
        {
          text: 'Salesforce vs HubSpot comparison',
          responses: 35,
          visibility: 92.1,
          sentimentPositive: 65.7,
          sentimentNeutral: 28.6,
          sentimentNegative: 5.7,
        },
        {
          text: 'Salesforce integration challenges',
          responses: 34,
          visibility: 88.3,
          sentimentPositive: 42.1,
          sentimentNeutral: 38.2,
          sentimentNegative: 19.7,
        },
      ],
    },
    {
      topicName: 'ERP',
      prompts: [
        {
          text: 'Best ERP systems for manufacturing companies',
          responses: 28,
          visibility: 83.4,
          sentimentPositive: 71.4,
          sentimentNeutral: 22.9,
          sentimentNegative: 5.7,
        },
        {
          text: 'SAP vs Oracle ERP comparison',
          responses: 19,
          visibility: 78.9,
          sentimentPositive: 52.6,
          sentimentNeutral: 36.8,
          sentimentNegative: 10.6,
        },
        {
          text: 'Cloud ERP vs on-premise ERP',
          responses: 22,
          visibility: 81.2,
          sentimentPositive: 68.2,
          sentimentNeutral: 27.3,
          sentimentNegative: 4.5,
        },
        {
          text: 'ERP implementation timeline and costs',
          responses: 15,
          visibility: 74.6,
          sentimentPositive: 48.0,
          sentimentNeutral: 40.0,
          sentimentNegative: 12.0,
        },
        {
          text: 'Small business ERP solutions',
          responses: 25,
          visibility: 79.8,
          sentimentPositive: 73.6,
          sentimentNeutral: 20.8,
          sentimentNegative: 5.6,
        },
      ],
    },
    {
      topicName: 'Cloud Cost Management & FinOps',
      prompts: [
        {
          text: 'AWS cost optimization strategies',
          responses: 42,
          visibility: 94.2,
          sentimentPositive: 82.1,
          sentimentNeutral: 16.7,
          sentimentNegative: 1.2,
        },
        {
          text: 'FinOps best practices for cloud cost management',
          responses: 38,
          visibility: 91.8,
          sentimentPositive: 79.8,
          sentimentNeutral: 18.4,
          sentimentNegative: 1.8,
        },
        {
          text: 'Multi-cloud cost management tools',
          responses: 29,
          visibility: 87.6,
          sentimentPositive: 75.9,
          sentimentNeutral: 20.7,
          sentimentNegative: 3.4,
        },
        {
          text: 'Azure cost management vs AWS cost explorer',
          responses: 33,
          visibility: 89.4,
          sentimentPositive: 71.0,
          sentimentNeutral: 25.8,
          sentimentNegative: 3.2,
        },
        {
          text: 'Cloud cost allocation and chargeback models',
          responses: 24,
          visibility: 85.3,
          sentimentPositive: 77.1,
          sentimentNeutral: 19.6,
          sentimentNegative: 3.3,
        },
      ],
    },
  ];

  for (const topicData of promptsData) {
    const topic = topics.find(t => t.name === topicData.topicName);
    if (!topic) continue;

    for (const promptData of topicData.prompts) {
      const prompt = await prisma.prompt.create({
        data: {
          text: promptData.text,
          responses: promptData.responses,
          visibility: promptData.visibility,
          sentimentPositive: promptData.sentimentPositive,
          sentimentNeutral: promptData.sentimentNeutral,
          sentimentNegative: promptData.sentimentNegative,
          topicId: topic.id,
        },
      });

      // Create AI provider responses for each prompt
      const providers = [
        AIProvider.ChatGPT,
        AIProvider.Gemini,
        AIProvider.Perplexity,
      ];

      for (const provider of providers) {
        await prisma.aIProviderResponse.create({
          data: {
            company:
              provider === AIProvider.ChatGPT
                ? 'OpenAI'
                : provider === AIProvider.Gemini
                  ? 'Google'
                  : 'Perplexity AI',
            provider: provider,
            homepage:
              provider === AIProvider.ChatGPT
                ? 'https://openai.com'
                : provider === AIProvider.Gemini
                  ? 'https://ai.google'
                  : 'https://perplexity.ai',
            response: `This is a comprehensive response from ${provider} about ${promptData.text}. The response includes detailed analysis, recommendations, and insights based on the latest data and best practices in the industry.`,
            insightTitle: `${provider} Analysis: ${topicData.topicName} Insights`,
            insightSummary: `Based on ${provider}'s analysis, key findings include market trends, competitive advantages, and strategic recommendations for ${topicData.topicName}.`,
            insightProposedActions: [
              'Implement recommended best practices',
              'Evaluate competitor solutions',
              'Optimize current processes',
              'Consider market positioning',
            ],
            insightImpact:
              Math.random() > 0.7
                ? InsightImpact.High
                : Math.random() > 0.4
                  ? InsightImpact.Medium
                  : InsightImpact.Low,
            insightLinks: [
              'https://example.com/research',
              'https://example.com/analysis',
              'https://example.com/recommendations',
            ],
            sources: [
              'Industry Report 2023',
              'Market Analysis Q4',
              'Expert Interviews',
            ],
            companyMentions: ['Company A', 'Company B', 'Company C'],
            competitionMentions: ['Competitor 1', 'Competitor 2'],
            promptId: prompt.id,
          },
        });
      }
    }
  }

  console.log('✅ Created prompts and AI provider responses');

  // Create Competitors (removed Microsoft Dynamics)
  const competitors = await Promise.all([
    prisma.competitor.create({
      data: {
        name: 'Salesforce',
        rank: 1,
        sentimentPositive: 72.4,
        sentimentNeutral: 21.8,
        sentimentNegative: 5.8,
        visibility: 94.2,
        visibilityChange: 2.1,
        favicon: 'https://www.salesforce.com/favicon.ico',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'HubSpot',
        rank: 2,
        sentimentPositive: 78.9,
        sentimentNeutral: 18.2,
        sentimentNegative: 2.9,
        visibility: 87.6,
        visibilityChange: 5.3,
        favicon: 'https://www.hubspot.com/favicon.ico',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'Oracle CX',
        rank: 3,
        sentimentPositive: 58.7,
        sentimentNeutral: 32.4,
        sentimentNegative: 8.9,
        visibility: 76.8,
        visibilityChange: -3.4,
        favicon: 'https://www.oracle.com/favicon.ico',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'Pipedrive',
        rank: 4,
        sentimentPositive: 81.2,
        sentimentNeutral: 16.8,
        sentimentNegative: 2.0,
        visibility: 71.3,
        visibilityChange: 8.7,
        favicon: 'https://www.pipedrive.com/favicon.ico',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'Zoho CRM',
        rank: 5,
        sentimentPositive: 74.6,
        sentimentNeutral: 22.1,
        sentimentNegative: 3.3,
        visibility: 68.9,
        visibilityChange: 3.2,
        favicon: 'https://www.zoho.com/favicon.ico',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'SAP CRM',
        rank: 6,
        sentimentPositive: 52.8,
        sentimentNeutral: 38.7,
        sentimentNegative: 8.5,
        visibility: 65.4,
        visibilityChange: -2.1,
        favicon: 'https://www.sap.com/favicon.ico',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'Freshsales',
        rank: 7,
        sentimentPositive: 79.3,
        sentimentNeutral: 18.4,
        sentimentNegative: 2.3,
        visibility: 62.7,
        visibilityChange: 6.8,
        favicon: 'https://www.freshworks.com/favicon.ico',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'SugarCRM',
        rank: 8,
        sentimentPositive: 68.1,
        sentimentNeutral: 26.7,
        sentimentNegative: 5.2,
        visibility: 58.9,
        visibilityChange: 1.4,
        favicon: 'https://www.sugarcrm.com/favicon.ico',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'Insightly',
        rank: 9,
        sentimentPositive: 72.5,
        sentimentNeutral: 24.8,
        sentimentNegative: 2.7,
        visibility: 55.2,
        visibilityChange: 4.3,
        favicon: 'https://www.insightly.com/favicon.ico',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'Yael Group',
        rank: 10,
        sentimentPositive: 65.8,
        sentimentNeutral: 28.2,
        sentimentNegative: 6.0,
        visibility: Math.random() * 10 + 5, // 5-15% visibility range
        visibilityChange: (Math.random() - 0.5) * 4, // ±2% change
        favicon: 'https://www.yaelgroup.com/favicon.ico',
      },
    }),
  ]);

  console.log('✅ Created competitors');

  // Create competitor history data (last 6 months)
  const now = new Date();
  const months = 6;

  for (const competitor of competitors) {
    for (let i = months; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      let baseVisibility = competitor.visibility;
      let variation = (Math.random() - 0.5) * 10; // ±5% variation

      // Special handling for Yael Group to keep visibility in 5-15% range
      if (competitor.name === 'Yael Group') {
        baseVisibility = Math.random() * 10 + 5; // 5-15% range
        variation = (Math.random() - 0.5) * 4; // Smaller variation for Yael Group
      }

      const visibility = Math.max(0, Math.min(100, baseVisibility + variation));

      await prisma.competitorHistory.create({
        data: {
          date,
          visibility,
          competitorId: competitor.id,
        },
      });
    }
  }

  console.log('✅ Created competitor history data');

  // Create Sources (reduced Yael Group mentions to 5-15% of total)
  const sources = await Promise.all([
    prisma.source.create({
      data: {
        source: 'Reddit',
        baseUrl: 'https://reddit.com',
        yaelGroupMentions: Math.floor(Math.random() * 25 + 25), // 25-49 mentions (5-10% of 498)
        competitionMentions: 342,
        totalMentions: 498,
      },
    }),
    prisma.source.create({
      data: {
        source: 'Stack Overflow',
        baseUrl: 'https://stackoverflow.com',
        yaelGroupMentions: Math.floor(Math.random() * 20 + 18), // 18-37 mentions (5-10% of 356)
        competitionMentions: 267,
        totalMentions: 356,
      },
    }),
    prisma.source.create({
      data: {
        source: 'Hacker News',
        baseUrl: 'https://news.ycombinator.com',
        yaelGroupMentions: Math.floor(Math.random() * 15 + 14), // 14-28 mentions (5-10% of 271)
        competitionMentions: 198,
        totalMentions: 271,
      },
    }),
    prisma.source.create({
      data: {
        source: 'TechCrunch',
        baseUrl: 'https://techcrunch.com',
        yaelGroupMentions: Math.floor(Math.random() * 12 + 12), // 12-23 mentions (5-10% of 232)
        competitionMentions: 187,
        totalMentions: 232,
      },
    }),
    prisma.source.create({
      data: {
        source: 'Product Hunt',
        baseUrl: 'https://producthunt.com',
        yaelGroupMentions: Math.floor(Math.random() * 11 + 11), // 11-22 mentions (5-10% of 226)
        competitionMentions: 134,
        totalMentions: 226,
      },
    }),
    prisma.source.create({
      data: {
        source: 'GitHub Issues',
        baseUrl: 'https://github.com',
        yaelGroupMentions: Math.floor(Math.random() * 11 + 11), // 11-21 mentions (5-10% of 212)
        competitionMentions: 145,
        totalMentions: 212,
      },
    }),
    prisma.source.create({
      data: {
        source: 'Medium',
        baseUrl: 'https://medium.com',
        yaelGroupMentions: Math.floor(Math.random() * 10 + 10), // 10-19 mentions (5-10% of 194)
        competitionMentions: 156,
        totalMentions: 194,
      },
    }),
    prisma.source.create({
      data: {
        source: 'Dev.to',
        baseUrl: 'https://dev.to',
        yaelGroupMentions: Math.floor(Math.random() * 8 + 8), // 8-15 mentions (5-10% of 152)
        competitionMentions: 98,
        totalMentions: 152,
      },
    }),
    prisma.source.create({
      data: {
        source: 'Quora',
        baseUrl: 'https://quora.com',
        yaelGroupMentions: Math.floor(Math.random() * 6 + 6), // 6-11 mentions (5-10% of 116)
        competitionMentions: 87,
        totalMentions: 116,
      },
    }),
    prisma.source.create({
      data: {
        source: 'Twitter',
        baseUrl: 'https://twitter.com',
        yaelGroupMentions: Math.floor(Math.random() * 18 + 18), // 18-36 mentions (5-10% of 368)
        competitionMentions: 245,
        totalMentions: 368,
      },
    }),
  ]);

  console.log('✅ Created sources');

  // Create source details
  for (const source of sources) {
    const detailCount = Math.floor(Math.random() * 5) + 3; // 3-7 details per source

    for (let i = 0; i < detailCount; i++) {
      // Ensure Yael Group mentions stay low (0-3 per detail, with most having 0-1)
      const yaelMentions =
        Math.random() < 0.7 ? 0 : Math.floor(Math.random() * 3);
      const compMentions = Math.floor(
        Math.random() * (source.competitionMentions / 2)
      );

      await prisma.sourceDetail.create({
        data: {
          url: `${source.baseUrl}/topic-${i + 1}`,
          yaelGroupMentions: yaelMentions,
          competitionMentions: compMentions,
          totalMentions: yaelMentions + compMentions,
          sourceId: source.id,
        },
      });
    }
  }

  console.log('✅ Created source details');
  console.log('🎉 Database seeding completed successfully!');
};

main()
  .catch(e => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
