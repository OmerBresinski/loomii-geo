import { Router } from 'express';
import { prisma } from '@/utils/database';
import { subDays } from 'date-fns';

const router = Router();

router.get('/:companyId', async (req, res) => {
  const companyId = Number(req.params.companyId);
  const span = Number(((req.query.days as string) ?? '30').replace(/\\D/g, ''));
  const since = subDays(new Date(), span);

  const topics = await prisma.topic.findMany({
    where: { companyId },
    include: {
      prompts: {
        include: {
          promptRuns: {
            where: { runAt: { gte: since } },
            include: { companyMentions: { where: { companyId } } },
          },
        },
      },
    },
  });

  const payload = topics
    .map(t => {
      const vis: number[] = [],
        sent: number[] = [];
      t.prompts.forEach(p =>
        p.promptRuns.forEach(r =>
          r.companyMentions.forEach(cm => {
            vis.push(cm.visibilityPct);
            sent.push(cm.sentiment);
          })
        )
      );
      return {
        topicId: t.id,
        topicName: t.name,
        visibility: vis.length ? vis.reduce((a, b) => a + b) / vis.length : 0,
        sentiment: sent.length ? sent.reduce((a, b) => a + b) / sent.length : 0,
      };
    })
    .sort((a, b) => b.visibility - a.visibility);

  res.json(payload);
});

export const analyticsRouter = router;
