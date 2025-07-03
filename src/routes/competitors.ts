import { Router } from 'express';
import { prisma } from '@/utils/database';
import { subDays } from 'date-fns';

const router = Router();

router.get('/:companyId', async (req, res) => {
  const seedId = Number(req.query.companyId);
  const span = Number(((req.query.days as string) ?? '30').replace(/\D/g, ''));
  const since = subDays(new Date(), span);

  const totalRuns = await prisma.promptRun.count({
    where: { runAt: { gte: since } },
  });

  const rows = await prisma.companyMention.groupBy({
    by: ['companyId'],
    where: { promptRun: { runAt: { gte: since } } },
    _count: { _all: true },
    _avg: { sentiment: true },
  });

  const leaderboard = await Promise.all(
    rows
      .sort((a, b) => b._count._all - a._count._all)
      .map(async (row, idx) => {
        const company = await prisma.company.findUnique({
          where: { id: row.companyId },
        });

        return {
          rank: idx + 1,
          companyId: row.companyId,
          name: company?.name ?? 'Unknown',
          domain: company?.domain ?? '',
          visibility: totalRuns ? (row._count._all / totalRuns) * 100 : 0,
          sentiment: row._avg.sentiment ?? 0,
          isSelf: row.companyId === seedId,
        };
      })
  );

  res.json(leaderboard);
});

export const competitorsRouter = router;
