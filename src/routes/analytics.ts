import { Router } from 'express';
import { prisma } from '@/utils/database';
import { subDays } from 'date-fns';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(requireAuth);

router.get('/:companyId', async (req, res) => {
  const organizationId = req.auth?.organization?.id;
  const company = await prisma.company.findFirst({
    where: { organizationId },
    include: {
      topics: {
        include: {
          prompts: true,
        },
      },
    },
  });
  const span = Number(((req.query.days as string) ?? '30').replace(/\D/g, ''));
  const since = subDays(new Date(), span);

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const topics = await prisma.topic.findMany({
    where: { companyId: company.id },
    include: {
      prompts: {
        include: {
          promptRuns: {
            where: { runAt: { gte: since } },
            include: {
              companyMentions: {
                where: { companyId: company.id },
                select: { sentiment: true },
              },
            },
          },
        },
      },
    },
  });

  const payload = topics
    .map(t => {
      let visSum = 0;
      let runCnt = 0;
      const sentiments: number[] = [];

      t.prompts.forEach(p =>
        p.promptRuns.forEach(r => {
          runCnt += 1;
          if (r.companyMentions.length) {
            visSum += 100;
            sentiments.push(r.companyMentions[0].sentiment);
          }
        })
      );

      return {
        topicId: t.id,
        topicName: t.name,
        visibility: +(runCnt ? visSum / runCnt : 0).toFixed(2),
        sentiment: +(
          sentiments.length
            ? sentiments.reduce((a, b) => a + b) / sentiments.length
            : 0
        ).toFixed(2),
      };
    })
    .sort((a, b) => b.visibility - a.visibility);

  return res.json(payload);
});

export { router as analyticsRouter };
