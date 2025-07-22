import { Router } from 'express';
import { prisma } from '@/utils/database';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const organizationId = req.auth?.organization?.id;
  const span = Number('30'.replace(/\D/g, ''));

  const company = await prisma.company.findUnique({
    where: { organizationId },
    include: {
      topics: {
        include: {
          prompts: {
            include: {
              promptRuns: {
                where: {
                  runAt: {
                    gte: new Date(Date.now() - span * 24 * 60 * 60 * 1000),
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
      },
    },
  });

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const competitorData = new Map<
    number,
    {
      companyId: number;
      companyName: string;
      companyDomain: string;
      mentions: number;
      sentiments: number[];
    }
  >();

  company.topics.forEach(topic => {
    topic.prompts.forEach(prompt => {
      prompt.promptRuns.forEach(run => {
        run.companyMentions.forEach(mention => {
          if (mention.companyId !== company.id) {
            const existing = competitorData.get(mention.companyId) || {
              companyId: mention.companyId,
              companyName: mention.company.name,
              companyDomain: mention.company.domain,
              mentions: 0,
              sentiments: [],
            };
            existing.mentions += 1;
            existing.sentiments.push(mention.sentiment);
            competitorData.set(mention.companyId, existing);
          }
        });
      });
    });
  });

  const payload = Array.from(competitorData.values())
    .map(comp => ({
      companyId: comp.companyId,
      companyName: comp.companyName,
      companyDomain: comp.companyDomain,
      mentions: comp.mentions,
      averageSentiment:
        comp.sentiments.length > 0
          ? comp.sentiments.reduce((sum, sentiment) => sum + sentiment, 0) /
            comp.sentiments.length
          : 0,
    }))
    .sort((a, b) => b.mentions - a.mentions);

  return res.json(payload);
});

router.get('/history', async (req, res) => {
  console.log('history');
  const organizationId = req.auth?.organization?.id;
  const span = Number((req.query.span as string) || '30');

  const company = await prisma.company.findUnique({
    where: { organizationId },
    include: {
      topics: {
        include: {
          prompts: {
            include: {
              promptRuns: {
                where: {
                  runAt: {
                    gte: new Date(Date.now() - span * 24 * 60 * 60 * 1000),
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
      },
    },
  });

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const dailyData = new Map<
    string,
    {
      date: string;
      totalRuns: number;
      competitors: Map<
        number,
        {
          companyId: number;
          company: any;
          mentions: number;
        }
      >;
    }
  >();

  company.topics.forEach(topic => {
    topic.prompts.forEach(prompt => {
      prompt.promptRuns.forEach(run => {
        const dateKey = run.runAt.toISOString().slice(0, 13); // YYYY-MM-DDTHH

        if (!dailyData.has(dateKey)) {
          dailyData.set(dateKey, {
            date: dateKey,
            totalRuns: 0,
            competitors: new Map(),
          });
        }

        const dayData = dailyData.get(dateKey)!;
        dayData.totalRuns += 1;

        // Track which companies were mentioned in this run (to avoid double-counting)
        const companiesMentionedInRun = new Set<number>();
        run.companyMentions.forEach(mention => {
          companiesMentionedInRun.add(mention.companyId);
        });

        // Increment mention count once per company per run
        companiesMentionedInRun.forEach(companyId => {
          const mention = run.companyMentions.find(m => m.companyId === companyId)!;
          const existing = dayData.competitors.get(companyId) || {
            companyId: companyId,
            company: mention.company,
            mentions: 0,
          };
          existing.mentions += 1;
          dayData.competitors.set(companyId, existing);
        });
      });
    });
  });

  // Get all unique competitors across all days
  const allCompetitors = new Map<number, any>();
  dailyData.forEach(dayData => {
    dayData.competitors.forEach((competitor, companyId) => {
      allCompetitors.set(companyId, competitor.company);
    });
  });

  // Get all dates in the range
  const allDates = Array.from(dailyData.keys()).sort();

  // Generate complete history for each competitor across all dates
  const historyPayload = [];
  for (const [companyId, company] of allCompetitors.entries()) {
    for (const date of allDates) {
      const dayData = dailyData.get(date)!;
      const competitor = dayData.competitors.get(companyId);
      const mentions = competitor ? competitor.mentions : 0;
      const visibility =
        dayData.totalRuns > 0 ? (mentions / dayData.totalRuns) * 100 : 0;

      historyPayload.push({
        id: `${companyId}-${date}`,
        date,
        visibility,
        competitorId: companyId.toString(),
        competitor: {
          companyId: companyId,
          companyName: company.name,
          domain: company.domain,
        },
      });
    }
  }

  historyPayload.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  console.log(`Returning ${historyPayload.length} history records for ${allCompetitors.size} competitors across ${allDates.length} time periods`);
  
  return res.json(historyPayload);
});

export { router as competitorsRouter };
