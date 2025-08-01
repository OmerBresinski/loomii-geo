import { Router, Request, Response } from 'express';
import { prisma } from '@/utils/database';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  const organizationId = req.auth?.organization?.id;
  const span = Number(((req.query.days as string) ?? '30').replace(/\D/g, ''));
  const since = subDays(new Date(), span);

  try {
    // Get the organization's company
    const company = await prisma.company.findFirst({
      where: { organizationId },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get historical visibility data
    const visibilityData = await getHistoricalVisibilityData(company.id, since);
    
    // Get historical sentiment data
    const sentimentData = await getHistoricalSentimentData(company.id, since);
    
    // Get competitor position data
    const competitorPosition = await getCompetitorPositionData(company.id, company.domain, since);

    return res.json({
      visibility: visibilityData,
      sentiment: sentimentData,
      competitorPosition,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch dashboard data',
    });
  }
});

// Helper function to get historical visibility data
async function getHistoricalVisibilityData(companyId: number, since: Date) {
  // Get all prompt runs for this company since the specified date
  const promptRuns = await prisma.promptRun.findMany({
    where: {
      prompt: {
        companyId: companyId,
      },
      runAt: {
        gte: since,
      },
    },
    include: {
      companyMentions: {
        include: {
          company: true,
        },
      },
    },
    orderBy: {
      runAt: 'asc',
    },
  });

  // Group by date and calculate daily visibility
  const dailyData = new Map<string, { totalRuns: number; mentionRuns: number }>();
  
  promptRuns.forEach(run => {
    const dateKey = format(run.runAt, 'yyyy-MM-dd');
    const existing = dailyData.get(dateKey) || { totalRuns: 0, mentionRuns: 0 };
    
    existing.totalRuns += 1;
    
    // Check if this run mentions the company
    const companyMentioned = run.companyMentions.some(
      mention => mention.companyId === companyId
    );
    
    if (companyMentioned) {
      existing.mentionRuns += 1;
    }
    
    dailyData.set(dateKey, existing);
  });

  // Convert to array and calculate visibility percentages
  const visibilityHistory = Array.from(dailyData.entries()).map(([date, data]) => ({
    date,
    visibility: data.totalRuns > 0 ? Math.round((data.mentionRuns / data.totalRuns) * 100 * 100) / 100 : 0,
    totalRuns: data.totalRuns,
    mentionRuns: data.mentionRuns,
  }));

  // Calculate trend (compare first day to last day of the period)
  let trend: 'up' | 'down' | 'static' = 'static';
  if (visibilityHistory.length >= 2) {
    const firstDay = visibilityHistory[0];
    const lastDay = visibilityHistory[visibilityHistory.length - 1];
    
    const difference = lastDay.visibility - firstDay.visibility;
    if (Math.abs(difference) >= 1) { // 1% threshold
      trend = difference > 0 ? 'up' : 'down';
    }
  }

  // Calculate current average visibility
  const totalRuns = visibilityHistory.reduce((sum, day) => sum + day.totalRuns, 0);
  const totalMentions = visibilityHistory.reduce((sum, day) => sum + day.mentionRuns, 0);
  const currentVisibility = totalRuns > 0 ? Math.round((totalMentions / totalRuns) * 100 * 100) / 100 : 0;

  return {
    currentVisibility,
    trend,
    history: visibilityHistory,
  };
}

// Helper function to get historical sentiment data
async function getHistoricalSentimentData(companyId: number, since: Date) {
  // Get all company mentions for this company since the specified date
  const companyMentions = await prisma.companyMention.findMany({
    where: {
      companyId: companyId,
      promptRun: {
        runAt: {
          gte: since,
        },
      },
    },
    include: {
      promptRun: true,
    },
    orderBy: {
      promptRun: {
        runAt: 'asc',
      },
    },
  });

  // Group by date and calculate daily average sentiment
  const dailyData = new Map<string, { sentiments: number[]; count: number }>();
  
  companyMentions.forEach(mention => {
    const dateKey = format(mention.promptRun.runAt, 'yyyy-MM-dd');
    const existing = dailyData.get(dateKey) || { sentiments: [], count: 0 };
    
    existing.sentiments.push(mention.sentiment);
    existing.count += 1;
    
    dailyData.set(dateKey, existing);
  });

  // Convert to array and calculate daily average sentiments
  const sentimentHistory = Array.from(dailyData.entries()).map(([date, data]) => {
    const averageSentiment = data.sentiments.length > 0 
      ? Math.round((data.sentiments.reduce((sum, s) => sum + s, 0) / data.sentiments.length) * 100) / 100
      : 0;
    
    return {
      date,
      sentiment: averageSentiment,
      count: data.count,
    };
  });

  // Calculate trend (compare first day to last day of the period)
  let trend: 'up' | 'down' | 'static' = 'static';
  if (sentimentHistory.length >= 2) {
    const firstDay = sentimentHistory[0];
    const lastDay = sentimentHistory[sentimentHistory.length - 1];
    
    const difference = lastDay.sentiment - firstDay.sentiment;
    if (Math.abs(difference) >= 0.1) { // 0.1 threshold for sentiment
      trend = difference > 0 ? 'up' : 'down';
    }
  }

  // Calculate current average sentiment
  const allSentiments = companyMentions.map(m => m.sentiment);
  const currentSentiment = allSentiments.length > 0 
    ? Math.round((allSentiments.reduce((sum, s) => sum + s, 0) / allSentiments.length) * 100) / 100
    : 0;

  return {
    currentSentiment,
    trend,
    history: sentimentHistory,
  };
}

// Helper function to get competitor position data
async function getCompetitorPositionData(companyId: number, companyDomain: string, since: Date) {
  // Get the company with its prompts and runs (matching competitors endpoint logic)
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      prompts: {
        include: {
          promptRuns: {
            where: {
              runAt: {
                gte: since,
              },
            },
            include: {
              companyMentions: {
                include: { company: true },
              },
            },
          },
        },
      },
    },
  });

  if (!company || company.prompts.length === 0) {
    return {
      currentPosition: null,
      totalCompanies: 0,
      competitors: [],
    };
  }

  // Calculate competitor visibility data (same as competitors endpoint)
  const competitorData = new Map<number, {
    companyId: number;
    companyName: string;
    companyDomain: string;
    totalMentions: number;
    sentiments: number[];
    promptsMentionedIn: Set<number>;
  }>();

  let totalRuns = 0;

  company.prompts.forEach(prompt => {
    prompt.promptRuns.forEach(run => {
      totalRuns++;
      
      // Track which companies were mentioned in this run (including your own company)
      const companiesMentionedInRun = new Set<number>();
      run.companyMentions.forEach(mention => {
        companiesMentionedInRun.add(mention.companyId);
      });

      // For each company mentioned in this run, count it once
      companiesMentionedInRun.forEach(companyId => {
        const mention = run.companyMentions.find(m => m.companyId === companyId)!;
        const existing = competitorData.get(companyId) || {
          companyId: mention.companyId,
          companyName: mention.company.name,
          companyDomain: mention.company.domain,
          totalMentions: 0,
          sentiments: [],
          promptsMentionedIn: new Set<number>(),
        };
        
        existing.totalMentions += 1;
        existing.sentiments.push(mention.sentiment);
        existing.promptsMentionedIn.add(prompt.id);
        competitorData.set(companyId, existing);
      });
    });
  });

  // Calculate visibility percentage and create final payload
  const allCompanies = Array.from(competitorData.values())
    .map(comp => ({
      companyId: comp.companyId,
      companyName: comp.companyName,
      companyDomain: comp.companyDomain,
      mentions: comp.totalMentions,
      visibility: totalRuns > 0 ? Math.round((comp.totalMentions / totalRuns) * 100 * 100) / 100 : 0,
      averageSentiment:
        comp.sentiments.length > 0
          ? Math.round((comp.sentiments.reduce((sum, sentiment) => sum + sentiment, 0) / comp.sentiments.length) * 100) / 100
          : 0,
      promptCount: comp.promptsMentionedIn.size,
      isCurrentCompany: comp.companyId === companyId,
    }))
    .filter(comp => comp.visibility > 5 || comp.isCurrentCompany) // Include your company regardless of visibility threshold
    .sort((a, b) => b.visibility - a.visibility); // Sort by visibility (highest first)

  // Find the logged-in company's position
  const companyIndex = allCompanies.findIndex(c => c.companyId === companyId);
  
  if (companyIndex === -1) {
    // Company not found in rankings
    return {
      currentPosition: null,
      totalCompanies: allCompanies.length,
      competitors: [],
    };
  }

  const currentPosition = companyIndex + 1; // 1-based position
  const totalCompanies = allCompanies.length;

  // Get surrounding companies based on position
  let competitors: typeof allCompanies = [];
  
  if (currentPosition === 1) {
    // Company is first, get the two companies below
    competitors = allCompanies.slice(0, Math.min(3, totalCompanies)); // Current + up to 2 below
  } else if (currentPosition === totalCompanies) {
    // Company is last, get the two companies above
    competitors = allCompanies.slice(Math.max(0, companyIndex - 2), companyIndex + 1); // Up to 2 above + current
  } else {
    // Company is in the middle, get 1 above and 1 below
    competitors = allCompanies.slice(companyIndex - 1, companyIndex + 2); // 1 above + current + 1 below
  }

  return {
    currentPosition,
    totalCompanies,
    competitors: competitors.map((comp, index) => {
      // Calculate actual position based on where we are in the slice
      let actualPosition: number;
      if (currentPosition === 1) {
        actualPosition = index + 1;
      } else if (currentPosition === totalCompanies) {
        actualPosition = companyIndex - (competitors.length - 1) + index + 1;
      } else {
        actualPosition = companyIndex + index;
      }
      
      return {
        position: actualPosition,
        companyId: comp.companyId.toString(),
        companyName: comp.companyName,
        companyDomain: comp.companyDomain,
        visibility: comp.visibility,
        averageSentiment: comp.averageSentiment,
        isCurrentCompany: comp.isCurrentCompany,
      };
    }),
  };
}

export { router as dashboardRouter };