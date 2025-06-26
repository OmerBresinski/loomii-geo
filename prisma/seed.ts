import { PrismaClient, AIProvider, InsightImpact } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to generate random data within realistic ranges
const generateRandomData = (baseValue: number, variance: number = 0.3) => {
  return Math.max(0, baseValue + (Math.random() - 0.5) * variance * baseValue);
};

// Helper function to generate timestamps for the last 6 months
const generateTimestamps = (months: number = 6) => {
  const timestamps: Date[] = [];
  const now = new Date();
  const startDate = new Date(now.getTime() - months * 30 * 24 * 60 * 60 * 1000);

  for (
    let time = startDate.getTime();
    time <= now.getTime();
    time += 7 * 24 * 60 * 60 * 1000 // Weekly intervals
  ) {
    timestamps.push(new Date(time));
  }

  return timestamps;
};

// Helper function to generate realistic source URLs
const generateSourceUrls = (topicName: string): string[] => {
  const baseUrls = [
    'forbes.com/advisor/lists',
    'wikipedia.org',
    'techcrunch.com/articles',
    'bloomberg.com/news',
    'reuters.com/technology',
    'wsj.com/articles',
    'harvard.edu/research',
    'mit.edu/studies',
    'gartner.com/reports',
    'deloitte.com/insights',
    'mckinsey.com/industries',
    'accenture.com/insights',
    'salesforce.com/resources',
    'oracle.com/solutions',
    'microsoft.com/azure',
    'aws.amazon.com/solutions',
    'google.com/cloud',
    'ibm.com/cloud',
    'statista.com/statistics',
    'idc.com/research',
  ];

  const topicKeywords: { [key: string]: string[] } = {
    salesforce: ['salesforce', 'crm', 'customer-relationship'],
    erp: ['erp', 'enterprise-resource-planning', 'business-software'],
    'cloud cost management': ['finops', 'cloud-cost', 'cloud-optimization'],
    default: ['business', 'technology', 'solutions'],
  };

  const keywords =
    topicKeywords[topicName.toLowerCase()] || topicKeywords.default;
  const numSources = Math.floor(Math.random() * 4) + 2; // 2-5 sources

  return Array.from({ length: numSources }, () => {
    const baseUrl = baseUrls[Math.floor(Math.random() * baseUrls.length)];
    const keyword = keywords[Math.floor(Math.random() * keywords.length)];
    return `https://${baseUrl}/${keyword}-guide`;
  });
};

// Helper function to generate company mentions
const generateCompanyMentions = (): string[] => {
  const allCompanies = [
    'Asperii',
    'Elad Software Systems',
    'Top Vision',
    'iCloudius - Cloud IT Solutions',
    'ONE Technologies',
    'Yael Group',
    'Matrix Global',
    'Ness Digital Engineering',
    'Amdocs',
    'NICE',
    'Sapiens',
    'Magic Software',
    'Verint',
    'EPAM Israel',
    'Comm-IT',
    'Sela Group',
  ];

  const numMentions = Math.floor(Math.random() * 4) + 2;
  return allCompanies.sort(() => 0.5 - Math.random()).slice(0, numMentions);
};

// Helper function to generate competition mentions
const generateCompetitionMentions = (topicName: string): string[] => {
  const competitionByTopic: { [key: string]: string[] } = {
    salesforce: [
      'HubSpot',
      'Microsoft Dynamics 365',
      'Pipedrive',
      'Zoho CRM',
      'SugarCRM',
      'Freshworks',
      'SAP Sales Cloud',
      'Oracle Sales Cloud',
    ],
    erp: [
      'SAP ERP',
      'Oracle ERP Cloud',
      'Microsoft Dynamics 365',
      'Infor ERP',
      'Sage ERP',
      'Priority ERP',
      'NetSuite ERP',
      'Epicor ERP',
    ],
    'cloud cost management': [
      'CloudHealth',
      'Cloudability',
      'AWS Cost Management',
      'Azure Cost Management',
      'Google Cloud Cost Management',
      'CloudZero',
      'Apptio Cloudability',
      'Flexera',
    ],
    default: [
      'IBM',
      'Accenture',
      'Deloitte',
      'PwC',
      'KPMG',
      'Capgemini',
      'Wipro',
      'TCS',
    ],
  };

  const topicKey = topicName.toLowerCase();
  const competitors =
    competitionByTopic[topicKey] || competitionByTopic.default;

  const numMentions = Math.floor(Math.random() * 3) + 2;
  return competitors.sort(() => 0.5 - Math.random()).slice(0, numMentions);
};

// Generate realistic AI responses
const generateAIResponse = (
  prompt: string,
  topicName: string,
  provider: AIProvider
): string => {
  const companies = [
    'Asperii',
    'Elad Software Systems',
    'Top Vision',
    'iCloudius - Cloud IT Solutions',
    'ONE Technologies',
    'Yael Group',
  ];

  const selectedCompanies = companies
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);

  const responses = {
    [AIProvider.ChatGPT]: [
      `Based on my knowledge, there are several reputable ${topicName.toLowerCase()} providers in Israel. Here are some top recommendations: ${selectedCompanies[0]} is known for their comprehensive solutions, ${selectedCompanies[1]} specializes in enterprise implementations, and ${selectedCompanies[2]} offers excellent ongoing support.`,
      `For ${topicName.toLowerCase()} services in Israel, I can suggest a few established companies. The market leaders include firms that have proven track records in implementation and support. Consider reaching out to ${selectedCompanies[0]}, ${selectedCompanies[1]}, and ${selectedCompanies[2]} for detailed proposals.`,
    ],
    [AIProvider.Gemini]: [
      `Israel has a robust ${topicName.toLowerCase()} ecosystem with several qualified providers. Key players include ${selectedCompanies[0]}, ${selectedCompanies[1]}, and ${selectedCompanies[2]}. Look for providers with certifications, case studies, and strong customer references in your industry.`,
      `The Israeli ${topicName.toLowerCase()} market features several reputable providers. Top considerations should include technical expertise, local regulatory knowledge, and post-implementation support capabilities.`,
    ],
    [AIProvider.Perplexity]: [
      `According to recent market analysis, Israel's ${topicName.toLowerCase()} landscape includes several top-tier providers. Leading companies in this space include ${selectedCompanies[0]}, ${selectedCompanies[1]}, and ${selectedCompanies[2]}.`,
      `Market research shows several established ${topicName.toLowerCase()} providers in Israel with strong track records. The best providers like ${selectedCompanies[0]}, ${selectedCompanies[1]}, and ${selectedCompanies[2]} typically combine technical expertise with deep understanding of local business requirements.`,
    ],
  };

  const providerResponses = responses[provider];
  return providerResponses[
    Math.floor(Math.random() * providerResponses.length)
  ];
};

// Helper function to extract base URL
const getBaseUrl = (url: string): string => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url.split('/')[0].replace('www.', '');
  }
};

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.competitorHistory.deleteMany();
  await prisma.competitor.deleteMany();
  await prisma.sourceDetail.deleteMany();
  await prisma.source.deleteMany();
  await prisma.aIProviderResponse.deleteMany();
  await prisma.prompt.deleteMany();
  await prisma.topic.deleteMany();

  // Generate Topics and Prompts
  const topicsData = [
    {
      name: 'Salesforce',
      prompts: [
        "Who's the best Salesforce partner in Israel?",
        'Which Israeli company handles Salesforce Multi‑Cloud integration?',
        'Can I find a vendor offering Salesforce Data Cloud services in Israel?',
        'Who provides Salesforce outsourcing and ongoing support in Israel?',
        'Which Israeli firm implements Salesforce modules for sales, service, and marketing?',
      ],
    },
    {
      name: 'ERP',
      prompts: [
        'Who does Priority ERP implementation in Israel?',
        'Which company is best at NetSuite ERP local implementation?',
        'Where can I find NetSuite CRM+ERP integration services?',
        'Who offers Priority ERP customization for Israeli regulatory needs?',
        'Which vendor offers ERP consulting, including Oracle, NetSuite and Priority?',
      ],
    },
    {
      name: 'Cloud Cost Management & FinOps',
      prompts: [
        'Who offers cloud cost management and FinOps services in Israel?',
        'Which company helps optimize AWS/GCP/Azure spending?',
        'Where can I find cloud-native DevOps plus FinOps in one team?',
        'Who provides cloud budgeting and FinOps reporting?',
        'Which vendor combines infrastructure DevOps and cost optimization?',
      ],
    },
  ];

  let topicCount = 0;

  for (const topicData of topicsData) {
    // Create topic
    const topic = await prisma.topic.create({
      data: {
        name: topicData.name,
        status: Math.random() > 0.2, // 80% chance of being active
      },
    });

    topicCount++;

    // Create prompts for this topic
    for (const promptText of topicData.prompts) {
      const prompt = await prisma.prompt.create({
        data: {
          text: promptText,
          topicId: topic.id,
          status: Math.random() > 0.3, // 70% chance of being active
        },
      });

      // Create AI Provider Responses for each prompt
      const providers: AIProvider[] = [
        AIProvider.ChatGPT,
        AIProvider.Gemini,
        AIProvider.Perplexity,
      ];
      const selectedProviders = providers
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 3) + 1);

      for (const provider of selectedProviders) {
        const response = generateAIResponse(
          promptText,
          topicData.name,
          provider
        );
        const sources = generateSourceUrls(topicData.name);
        const companyMentions = generateCompanyMentions();
        const competitionMentions = generateCompetitionMentions(topicData.name);

        await prisma.aIProviderResponse.create({
          data: {
            company: provider,
            provider: provider,
            homepage: sources[0] || `https://${provider.toLowerCase()}.com`,
            response: response,
            insightTitle: `${provider} Analysis for ${topicData.name}`,
            insightSummary: response.substring(0, 200) + '...',
            insightProposedActions: [
              'Evaluate technical capabilities',
              'Request detailed proposals',
              'Check customer references',
              'Compare pricing models',
            ],
            insightImpact:
              Math.random() > 0.5
                ? InsightImpact.High
                : Math.random() > 0.5
                  ? InsightImpact.Medium
                  : InsightImpact.Low,
            insightLinks: sources,
            sources: sources,
            companyMentions: companyMentions,
            competitionMentions: competitionMentions,
            promptId: prompt.id,
          },
        });
      }
    }
  }

  // Generate Competitors
  const companiesData = [
    { name: 'Asperii', baseVisibility: 65 },
    { name: 'Elad Software Systems', baseVisibility: 58 },
    { name: 'Top Vision', baseVisibility: 55 },
    { name: 'iCloudius - Cloud IT Solutions', baseVisibility: 52 },
    { name: 'ONE Technologies', baseVisibility: 48 },
    { name: 'Matrix Global', baseVisibility: 45 },
    { name: 'Ness Digital Engineering', baseVisibility: 42 },
    { name: 'Amdocs', baseVisibility: 40 },
    { name: 'NICE', baseVisibility: 38 },
    { name: 'Sapiens', baseVisibility: 35 },
    { name: 'Magic Software', baseVisibility: 32 },
    { name: 'Verint', baseVisibility: 30 },
    { name: 'EPAM Israel', baseVisibility: 28 },
    { name: 'Comm-IT', baseVisibility: 25 },
    { name: 'Sela Group', baseVisibility: 22 },
    { name: 'Yael Group', baseVisibility: 42 },
  ];

  for (let i = 0; i < companiesData.length; i++) {
    const company = companiesData[i];
    const currentVisibility = Math.max(
      0,
      Math.min(100, company.baseVisibility + (Math.random() - 0.5) * 10)
    );
    const visibilityChange = (Math.random() - 0.5) * 4;

    const sentimentBase = Math.min(80, company.baseVisibility + 10);
    const positive = Math.max(20, sentimentBase + (Math.random() - 0.5) * 20);
    const negative = Math.max(
      0,
      Math.min(30, 100 - positive - (Math.random() * 40 + 30))
    );
    const neutral = 100 - positive - negative;

    const competitor = await prisma.competitor.create({
      data: {
        name: company.name,
        rank: i + 1,
        sentimentPositive: Math.round(positive),
        sentimentNeutral: Math.round(neutral),
        sentimentNegative: Math.round(negative),
        visibility: Math.round(currentVisibility * 10) / 10,
        visibilityChange: Math.round(visibilityChange * 10) / 10,
        favicon: `https://www.google.com/s2/favicons?domain=${company.name.toLowerCase().replace(/\s+/g, '')}.com&sz=256`,
      },
    });

    // Generate competitor history
    const timestamps = generateTimestamps(6);
    for (const timestamp of timestamps) {
      const baseVisibility = competitor.visibility;
      const variation = (Math.random() - 0.5) * 15;
      const visibility = Math.max(0, Math.min(100, baseVisibility + variation));

      await prisma.competitorHistory.create({
        data: {
          competitorId: competitor.id,
          date: timestamp,
          visibility: Math.round(visibility * 10) / 10,
        },
      });
    }
  }

  // Generate Sources
  const sourceMap = new Map<
    string,
    { details: any[]; yaelTotal: number; compTotal: number }
  >();

  // Extract sources from all AI provider responses
  const allResponses = await prisma.aIProviderResponse.findMany();

  for (const response of allResponses) {
    for (const sourceUrl of response.sources) {
      const baseUrl = getBaseUrl(sourceUrl);

      if (!sourceMap.has(baseUrl)) {
        sourceMap.set(baseUrl, { details: [], yaelTotal: 0, compTotal: 0 });
      }

      const sourceData = sourceMap.get(baseUrl)!;
      const mentionsYael = Math.random() < 0.05;
      const yaelMentions = mentionsYael
        ? Math.floor(Math.random() * 15) + 3
        : 0;
      const compMentions = Math.floor(Math.random() * 50) + 10;

      sourceData.details.push({
        url: sourceUrl,
        yaelGroupMentions: yaelMentions,
        competitionMentions: compMentions,
        totalMentions: yaelMentions + compMentions,
      });

      sourceData.yaelTotal += yaelMentions;
      sourceData.compTotal += compMentions;
    }
  }

  // Create sources
  for (const [baseUrl, data] of sourceMap.entries()) {
    const source = await prisma.source.create({
      data: {
        source: baseUrl,
        baseUrl: baseUrl,
        yaelGroupMentions: data.yaelTotal,
        competitionMentions: data.compTotal,
        totalMentions: data.yaelTotal + data.compTotal,
      },
    });

    // Create source details
    for (const detail of data.details) {
      await prisma.sourceDetail.create({
        data: {
          sourceId: source.id,
          url: detail.url,
          yaelGroupMentions: detail.yaelGroupMentions,
          competitionMentions: detail.competitionMentions,
          totalMentions: detail.totalMentions,
        },
      });
    }
  }

  console.log('✅ Seed completed successfully!');
  console.log(`📊 Created ${topicCount} topics`);
  console.log(`🤖 Created ${allResponses.length} AI provider responses`);
  console.log(`🏢 Created ${companiesData.length} competitors`);
  console.log(`📰 Created ${sourceMap.size} sources`);
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
