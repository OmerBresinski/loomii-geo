import { Router } from 'express';
import { prisma } from '@/utils/database';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const organizationId = req.auth?.organization?.id;
  const span = Number(((req.query.days as string) ?? '30').replace(/\D/g, ''));

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

export { router as competitorsRouter };
