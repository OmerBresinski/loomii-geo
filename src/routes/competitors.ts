import { Router } from 'express';
import { prisma } from '@/utils/database';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(requireAuth);

router.get('/:companyId', async (req, res) => {
  const companyId = Number(req.params.companyId);
  const span = Number(((req.query.days as string) ?? '30').replace(/\D/g, ''));

  const company = await prisma.company.findUnique({
    where: { id: companyId },
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

  const competitorData = new Map<number, any>();

  company.topics.forEach(topic => {
    topic.prompts.forEach(prompt => {
      prompt.promptRuns.forEach(run => {
        run.companyMentions.forEach(mention => {
          if (mention.companyId !== companyId) {
            const existing = competitorData.get(mention.companyId) || {
              companyId: mention.companyId,
              companyName: mention.company.name,
              mentions: 0,
              totalSentiment: 0,
            };
            existing.mentions += 1;
            existing.totalSentiment += mention.sentiment;
            competitorData.set(mention.companyId, existing);
          }
        });
      });
    });
  });

  const payload = Array.from(competitorData.values())
    .map(comp => ({
      ...comp,
      averageSentiment: comp.totalSentiment / comp.mentions,
    }))
    .sort((a, b) => b.mentions - a.mentions);

  res.json(payload);
});

export { router as competitorsRouter };
