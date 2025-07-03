import { Router } from 'express';
import { prisma } from '@/utils/database';
import { subDays } from 'date-fns';

const router = Router();

router.get('/', async (req, res) => {
  const companyId = Number(req.query.companyId);
  const span = Number(((req.query.days as string) ?? '30').replace(/\\D/g, ''));
  const since = subDays(new Date(), span);

  const rows = await prisma.companyMention.groupBy({
    by: ['companyId'],
    where: { promptRun: { runAt: { gte: since } } },
    _avg: { sentiment: true },
    _sum: { visibilityPct: true },
    orderBy: { _sum: { visibilityPct: 'desc' } },
  });

  const leaderboard = await Promise.all(
    rows.map(async (row, idx) => {
      const company = await prisma.company.findUnique({
        where: { id: row.companyId },
      });
      return {
        rank: idx + 1,
        companyId: row.companyId,
        name: company?.name ?? 'Unknown',
        domain: company?.domain ?? '',
        visibility: row._sum.visibilityPct ?? 0,
        sentiment: row._avg.sentiment ?? 0,
        isSelf: row.companyId === companyId,
      };
    })
  );

  res.json(leaderboard);
});

export const competitorsRouter = router;
