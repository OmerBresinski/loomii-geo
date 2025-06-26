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

  // Create Prompts and AI Provider Responses data first to calculate topic averages
  const promptsData = [
    {
      topicName: 'Salesforce',
      prompts: [
        {
          text: 'What are the best alternatives to Salesforce for small businesses?',
          responses: 8,
          visibility: 6.2, // Fixed visibility percentage
          sentimentPositive: 52.3,
          sentimentNeutral: 35.1,
          sentimentNegative: 12.6,
        },
        {
          text: 'How does Salesforce pricing compare to competitors?',
          responses: 12,
          visibility: 9.8, // Fixed visibility percentage
          sentimentPositive: 48.7,
          sentimentNeutral: 38.4,
          sentimentNegative: 12.9,
        },
        {
          text: 'Salesforce implementation best practices',
          responses: 6,
          visibility: 4.5, // Fixed visibility percentage
          sentimentPositive: 62.1,
          sentimentNeutral: 28.3,
          sentimentNegative: 9.6,
        },
        {
          text: 'Salesforce vs HubSpot comparison',
          responses: 14,
          visibility: 11.3, // Fixed visibility percentage
          sentimentPositive: 51.8,
          sentimentNeutral: 32.4,
          sentimentNegative: 15.8,
        },
        {
          text: 'Salesforce integration challenges',
          responses: 11,
          visibility: 7.9, // Fixed visibility percentage
          sentimentPositive: 38.2,
          sentimentNeutral: 42.1,
          sentimentNegative: 19.7,
        },
      ],
    },
    {
      topicName: 'ERP',
      prompts: [
        {
          text: 'Best ERP systems for manufacturing companies',
          responses: 9,
          visibility: 8.4, // Fixed visibility percentage
          sentimentPositive: 55.2,
          sentimentNeutral: 34.8,
          sentimentNegative: 10.0,
        },
        {
          text: 'SAP vs Oracle ERP comparison',
          responses: 6,
          visibility: 5.1, // Fixed visibility percentage
          sentimentPositive: 42.3,
          sentimentNeutral: 43.2,
          sentimentNegative: 14.5,
        },
        {
          text: 'Cloud ERP vs on-premise ERP',
          responses: 7,
          visibility: 6.8, // Fixed visibility percentage
          sentimentPositive: 58.9,
          sentimentNeutral: 31.4,
          sentimentNegative: 9.7,
        },
        {
          text: 'ERP implementation timeline and costs',
          responses: 5,
          visibility: 3.2, // Fixed visibility percentage
          sentimentPositive: 35.6,
          sentimentNeutral: 46.8,
          sentimentNegative: 17.6,
        },
        {
          text: 'Small business ERP solutions',
          responses: 8,
          visibility: 9.7, // Fixed visibility percentage
          sentimentPositive: 63.4,
          sentimentNeutral: 28.1,
          sentimentNegative: 8.5,
        },
      ],
    },
    {
      topicName: 'Cloud Cost Management & FinOps',
      prompts: [
        {
          text: 'AWS cost optimization strategies',
          responses: 16,
          visibility: 14.2, // Fixed visibility percentage (higher for specialty area)
          sentimentPositive: 68.5,
          sentimentNeutral: 24.8,
          sentimentNegative: 6.7,
        },
        {
          text: 'FinOps best practices for cloud cost management',
          responses: 14,
          visibility: 12.8, // Fixed visibility percentage
          sentimentPositive: 65.3,
          sentimentNeutral: 28.1,
          sentimentNegative: 6.6,
        },
        {
          text: 'Multi-cloud cost management tools',
          responses: 11,
          visibility: 10.5, // Fixed visibility percentage
          sentimentPositive: 61.2,
          sentimentNeutral: 32.4,
          sentimentNegative: 6.4,
        },
        {
          text: 'Azure cost management vs AWS cost explorer',
          responses: 12,
          visibility: 13.6, // Fixed visibility percentage
          sentimentPositive: 58.7,
          sentimentNeutral: 35.2,
          sentimentNegative: 6.1,
        },
        {
          text: 'Cloud cost allocation and chargeback models',
          responses: 9,
          visibility: 8.9, // Fixed visibility percentage
          sentimentPositive: 64.8,
          sentimentNeutral: 29.6,
          sentimentNegative: 5.6,
        },
      ],
    },
  ];

  // Calculate topic averages from prompt data
  const calculateTopicAverages = (prompts: any[]) => {
    const totalPrompts = prompts.length;
    const totalResponses = prompts.reduce((sum, p) => sum + p.responses, 0);
    const avgVisibility =
      prompts.reduce((sum, p) => sum + p.visibility, 0) / totalPrompts;
    const avgSentimentPositive =
      prompts.reduce((sum, p) => sum + p.sentimentPositive, 0) / totalPrompts;
    const avgSentimentNeutral =
      prompts.reduce((sum, p) => sum + p.sentimentNeutral, 0) / totalPrompts;
    const avgSentimentNegative =
      prompts.reduce((sum, p) => sum + p.sentimentNegative, 0) / totalPrompts;

    return {
      responseCount: totalResponses,
      visibility: Math.round(avgVisibility * 10) / 10, // Round to 1 decimal
      sentimentPositive: Math.round(avgSentimentPositive * 10) / 10,
      sentimentNeutral: Math.round(avgSentimentNeutral * 10) / 10,
      sentimentNegative: Math.round(avgSentimentNegative * 10) / 10,
    };
  };

  // Create Topics with calculated averages
  const topics = await Promise.all([
    prisma.topic.create({
      data: {
        name: 'Salesforce',
        ...calculateTopicAverages(promptsData[0].prompts),
        status: true,
      },
    }),
    prisma.topic.create({
      data: {
        name: 'ERP',
        ...calculateTopicAverages(promptsData[1].prompts),
        status: true,
      },
    }),
    prisma.topic.create({
      data: {
        name: 'Cloud Cost Management & FinOps',
        ...calculateTopicAverages(promptsData[2].prompts),
        status: true,
      },
    }),
  ]);

  console.log('✅ Created topics');

  // Create Prompts and AI Provider Responses
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
        name: 'Asperii',
        rank: 1,
        sentimentPositive: 72.4,
        sentimentNeutral: 21.8,
        sentimentNegative: 5.8,
        visibility: 65.0,
        visibilityChange: 2.1,
        favicon: 'https://asperii.com',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'Elad Software Systems',
        rank: 2,
        sentimentPositive: 68.9,
        sentimentNeutral: 24.2,
        sentimentNegative: 6.9,
        visibility: 58.0,
        visibilityChange: 1.8,
        favicon: 'https://www.eladsoft.com',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'Top Vision',
        rank: 3,
        sentimentPositive: 65.3,
        sentimentNeutral: 28.1,
        sentimentNegative: 6.6,
        visibility: 55.0,
        visibilityChange: -0.8,
        favicon: 'https://top-vision.co.il',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'iCloudius - Cloud IT Solutions',
        rank: 4,
        sentimentPositive: 70.2,
        sentimentNeutral: 23.4,
        sentimentNegative: 6.4,
        visibility: 52.0,
        visibilityChange: 3.2,
        favicon: 'https://icloudius.com',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'ONE Technologies',
        rank: 5,
        sentimentPositive: 61.8,
        sentimentNeutral: 30.2,
        sentimentNegative: 8.0,
        visibility: 48.0,
        visibilityChange: -1.5,
        favicon: 'https://one1.co.il',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'Matrix Global',
        rank: 6,
        sentimentPositive: 58.7,
        sentimentNeutral: 32.4,
        sentimentNegative: 8.9,
        visibility: 45.0,
        visibilityChange: 0.9,
        favicon: 'https://www.matrix.co.il',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'Ness Digital Engineering',
        rank: 7,
        sentimentPositive: 64.3,
        sentimentNeutral: 28.7,
        sentimentNegative: 7.0,
        visibility: 42.0,
        visibilityChange: 2.4,
        favicon: 'https://www.ness.com',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'Amdocs',
        rank: 8,
        sentimentPositive: 56.2,
        sentimentNeutral: 35.1,
        sentimentNegative: 8.7,
        visibility: 40.0,
        visibilityChange: -0.6,
        favicon: 'https://www.amdocs.com',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'NICE',
        rank: 9,
        sentimentPositive: 59.4,
        sentimentNeutral: 32.8,
        sentimentNegative: 7.8,
        visibility: 38.0,
        visibilityChange: 1.3,
        favicon: 'https://www.nice.com',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'Sapiens',
        rank: 10,
        sentimentPositive: 53.6,
        sentimentNeutral: 37.2,
        sentimentNegative: 9.2,
        visibility: 35.0,
        visibilityChange: -1.8,
        favicon: 'https://www.sapiens.com',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'Magic Software',
        rank: 11,
        sentimentPositive: 51.8,
        sentimentNeutral: 38.4,
        sentimentNegative: 9.8,
        visibility: 32.0,
        visibilityChange: 0.7,
        favicon: 'https://www.magicsoftware.com',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'Verint',
        rank: 12,
        sentimentPositive: 49.2,
        sentimentNeutral: 40.1,
        sentimentNegative: 10.7,
        visibility: 30.0,
        visibilityChange: -2.1,
        favicon: 'https://www.verint.com',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'EPAM Israel',
        rank: 13,
        sentimentPositive: 55.7,
        sentimentNeutral: 34.8,
        sentimentNegative: 9.5,
        visibility: 28.0,
        visibilityChange: 1.9,
        favicon: 'https://www.epam.com',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'Comm-IT',
        rank: 14,
        sentimentPositive: 47.3,
        sentimentNeutral: 41.2,
        sentimentNegative: 11.5,
        visibility: 25.0,
        visibilityChange: -0.4,
        favicon: 'https://www.comm-it.co.il',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'Sela Group',
        rank: 15,
        sentimentPositive: 44.8,
        sentimentNeutral: 43.1,
        sentimentNegative: 12.1,
        visibility: 22.0,
        visibilityChange: -1.2,
        favicon: 'https://www.selagroup.com',
      },
    }),
    prisma.competitor.create({
      data: {
        name: 'Yael Group',
        rank: 16,
        sentimentPositive: 41.2,
        sentimentNeutral: 45.8,
        sentimentNegative: 13.0,
        visibility: 12.0,
        visibilityChange: -0.8,
        favicon: 'https://www.yaelgroup.com',
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

  // Create Sources (only 4 sources mention Yael Group)
  const sources = await Promise.all([
    prisma.source.create({
      data: {
        source: 'Reddit',
        baseUrl: 'https://reddit.com',
        yaelGroupMentions: Math.floor(Math.random() * 6 + 5), // 5-10 mentions
        competitionMentions: 342,
        totalMentions: 498,
      },
    }),
    prisma.source.create({
      data: {
        source: 'Stack Overflow',
        baseUrl: 'https://stackoverflow.com',
        yaelGroupMentions: Math.floor(Math.random() * 6 + 5), // 5-10 mentions
        competitionMentions: 267,
        totalMentions: 356,
      },
    }),
    prisma.source.create({
      data: {
        source: 'Hacker News',
        baseUrl: 'https://news.ycombinator.com',
        yaelGroupMentions: 0, // No mentions
        competitionMentions: 198,
        totalMentions: 271,
      },
    }),
    prisma.source.create({
      data: {
        source: 'TechCrunch',
        baseUrl: 'https://techcrunch.com',
        yaelGroupMentions: 0, // No mentions
        competitionMentions: 187,
        totalMentions: 232,
      },
    }),
    prisma.source.create({
      data: {
        source: 'Product Hunt',
        baseUrl: 'https://producthunt.com',
        yaelGroupMentions: 0, // No mentions
        competitionMentions: 134,
        totalMentions: 226,
      },
    }),
    prisma.source.create({
      data: {
        source: 'GitHub Issues',
        baseUrl: 'https://github.com',
        yaelGroupMentions: Math.floor(Math.random() * 6 + 5), // 5-10 mentions
        competitionMentions: 145,
        totalMentions: 212,
      },
    }),
    prisma.source.create({
      data: {
        source: 'Medium',
        baseUrl: 'https://medium.com',
        yaelGroupMentions: 0, // No mentions
        competitionMentions: 156,
        totalMentions: 194,
      },
    }),
    prisma.source.create({
      data: {
        source: 'Dev.to',
        baseUrl: 'https://dev.to',
        yaelGroupMentions: Math.floor(Math.random() * 6 + 5), // 5-10 mentions
        competitionMentions: 98,
        totalMentions: 152,
      },
    }),
    prisma.source.create({
      data: {
        source: 'Quora',
        baseUrl: 'https://quora.com',
        yaelGroupMentions: 0, // No mentions
        competitionMentions: 87,
        totalMentions: 116,
      },
    }),
    prisma.source.create({
      data: {
        source: 'Twitter',
        baseUrl: 'https://twitter.com',
        yaelGroupMentions: 0, // No mentions
        competitionMentions: 245,
        totalMentions: 368,
      },
    }),
  ]);

  console.log('✅ Created sources');

  // Realistic URL generators for each source type
  const urlGenerators: { [key: string]: () => string } = {
    Reddit: () => {
      const subreddits = [
        'r/salesforce',
        'r/sysadmin',
        'r/devops',
        'r/entrepreneur',
        'r/smallbusiness',
        'r/aws',
        'r/AZURE',
        'r/CloudComputing',
      ];
      const postTypes = ['comments', 'posts'];
      const postIds = [
        'abc123def',
        'xyz789ghi',
        'qwe456rty',
        'asd789fgh',
        'zxc321vbn',
      ];
      const subreddit =
        subreddits[Math.floor(Math.random() * subreddits.length)];
      const postType = postTypes[Math.floor(Math.random() * postTypes.length)];
      const postId = postIds[Math.floor(Math.random() * postIds.length)];
      return `https://reddit.com/${subreddit}/${postType}/${postId}`;
    },
    'Stack Overflow': () => {
      const questionIds = [
        '45678901',
        '23456789',
        '67890123',
        '34567890',
        '78901234',
      ];
      const tags = [
        'salesforce',
        'erp',
        'aws-cost',
        'cloud-management',
        'finops',
        'azure-cost',
      ];
      const questionId =
        questionIds[Math.floor(Math.random() * questionIds.length)];
      const tag = tags[Math.floor(Math.random() * tags.length)];
      return `https://stackoverflow.com/questions/${questionId}/how-to-${tag.replace('-', '-')}?tab=votes`;
    },
    'Hacker News': () => {
      const itemIds = [
        '28934567',
        '29045678',
        '30156789',
        '31267890',
        '32378901',
      ];
      const itemId = itemIds[Math.floor(Math.random() * itemIds.length)];
      return `https://news.ycombinator.com/item?id=${itemId}`;
    },
    TechCrunch: () => {
      const years = ['2023', '2024'];
      const months = ['01', '03', '05', '07', '09', '11'];
      const articles = [
        'salesforce-alternatives-small-business',
        'erp-cloud-migration-trends',
        'aws-cost-optimization-guide',
        'finops-best-practices-2024',
        'cloud-cost-management-tools',
      ];
      const year = years[Math.floor(Math.random() * years.length)];
      const month = months[Math.floor(Math.random() * months.length)];
      const article = articles[Math.floor(Math.random() * articles.length)];
      return `https://techcrunch.com/${year}/${month}/${article}/?utm_source=feed&utm_medium=rss`;
    },
    'Product Hunt': () => {
      const products = [
        'salesforce-alternative-crm',
        'cloud-cost-optimizer',
        'erp-management-suite',
        'finops-dashboard',
        'aws-cost-analyzer',
      ];
      const product = products[Math.floor(Math.random() * products.length)];
      return `https://producthunt.com/posts/${product}?utm_source=badge-featured`;
    },
    'GitHub Issues': () => {
      const repos = [
        'salesforce/salesforce-cli',
        'aws/aws-cost-management',
        'microsoft/azure-cost-management',
        'terraform-providers/terraform-provider-aws',
        'kubernetes/kubernetes',
      ];
      const issueNumbers = ['1234', '5678', '9012', '3456', '7890'];
      const repo = repos[Math.floor(Math.random() * repos.length)];
      const issueNumber =
        issueNumbers[Math.floor(Math.random() * issueNumbers.length)];
      return `https://github.com/${repo}/issues/${issueNumber}`;
    },
    Medium: () => {
      const authors = [
        '@techwriter',
        '@cloudexpert',
        '@devopsguru',
        '@finopsspecialist',
        '@erpexpert',
      ];
      const slugs = [
        'salesforce-vs-hubspot-comparison-2024',
        'aws-cost-optimization-strategies',
        'erp-implementation-guide',
        'finops-culture-transformation',
        'cloud-cost-management-best-practices',
      ];
      const author = authors[Math.floor(Math.random() * authors.length)];
      const slug = slugs[Math.floor(Math.random() * slugs.length)];
      return `https://medium.com/${author}/${slug}?source=rss----2b6b4b4b4b4b---4`;
    },
    'Dev.to': () => {
      const authors = [
        'techblogger',
        'clouddev',
        'devopseng',
        'awsexpert',
        'azuredev',
      ];
      const slugs = [
        'salesforce-integration-tips',
        'aws-cost-monitoring-setup',
        'erp-system-selection-guide',
        'finops-automation-tools',
        'cloud-cost-alerts-setup',
      ];
      const author = authors[Math.floor(Math.random() * authors.length)];
      const slug = slugs[Math.floor(Math.random() * slugs.length)];
      return `https://dev.to/${author}/${slug}`;
    },
    Quora: () => {
      const topics = [
        'What-are-the-best-Salesforce-alternatives',
        'How-to-reduce-AWS-costs',
        'Which-ERP-system-is-best-for-manufacturing',
        'What-is-FinOps-and-why-is-it-important',
        'How-to-implement-cloud-cost-management',
      ];
      const topic = topics[Math.floor(Math.random() * topics.length)];
      return `https://quora.com/${topic}?share=1`;
    },
    Twitter: () => {
      const users = [
        'salesforceohana',
        'awscloud',
        'azure',
        'finopsorg',
        'erptoday',
      ];
      const tweetIds = [
        '1234567890123456789',
        '9876543210987654321',
        '5555555555555555555',
        '1111111111111111111',
        '9999999999999999999',
      ];
      const user = users[Math.floor(Math.random() * users.length)];
      const tweetId = tweetIds[Math.floor(Math.random() * tweetIds.length)];
      return `https://twitter.com/${user}/status/${tweetId}?utm_source=twitter&utm_medium=social`;
    },
  };

  // Create source details
  for (const source of sources) {
    const detailCount = Math.floor(Math.random() * 2) + 4; // 4-5 details per source

    // Calculate how to distribute Yael Group mentions across source details
    let remainingYaelMentions = source.yaelGroupMentions;
    const yaelMentionsPerDetail: number[] = [];

    // Only distribute mentions if this source has any
    if (remainingYaelMentions > 0) {
      // Distribute mentions across details (some details may have 0, others 1-3)
      for (let i = 0; i < detailCount; i++) {
        if (remainingYaelMentions > 0 && Math.random() < 0.6) {
          // 60% chance a detail gets mentions
          const mentionsForThisDetail = Math.min(
            Math.floor(Math.random() * 3) + 1, // 1-3 mentions max per detail
            remainingYaelMentions
          );
          yaelMentionsPerDetail.push(mentionsForThisDetail);
          remainingYaelMentions -= mentionsForThisDetail;
        } else {
          yaelMentionsPerDetail.push(0);
        }
      }

      // Distribute any remaining mentions
      while (remainingYaelMentions > 0) {
        const randomIndex = Math.floor(Math.random() * detailCount);
        yaelMentionsPerDetail[randomIndex]++;
        remainingYaelMentions--;
      }
    } else {
      // No mentions for this source
      for (let i = 0; i < detailCount; i++) {
        yaelMentionsPerDetail.push(0);
      }
    }

    for (let i = 0; i < detailCount; i++) {
      const yaelMentions = yaelMentionsPerDetail[i];
      const compMentions = Math.floor(
        Math.random() * (source.competitionMentions / 2)
      );

      // Generate realistic URL using the appropriate generator
      const urlGenerator = urlGenerators[source.source];
      const url = urlGenerator
        ? urlGenerator()
        : `${source.baseUrl}/topic-${i + 1}`;

      await prisma.sourceDetail.create({
        data: {
          url: url,
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
