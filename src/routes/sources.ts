import { Router } from 'express';
import { prisma } from '@/utils/database';
import { subDays } from 'date-fns';

const router = Router();

router.get('/:companyId', async (req, res) => {
  const companyId = Number(req.params.companyId);
  const span = Number(((req.query.days as string) ?? '30').replace(/\\D/g, ''));
  const since = subDays(new Date(), span);

  const details = await prisma.mentionDetail.findMany({
    where: { promptRun: { runAt: { gte: since } } },
    include: { sourceUrl: { include: { source: true } } },
  });

  const map = new Map<
    string,
    {
      source: string;
      url: string;
      companyMentions: number;
      competitorMentions: number;
      total: number;
    }
  >();

  details.forEach(d => {
    const key = d.sourceUrl.url;
    if (!map.has(key)) {
      map.set(key, {
        source: d.sourceUrl.source.name,
        url: d.sourceUrl.url,
        companyMentions: 0,
        competitorMentions: 0,
        total: 0,
      });
    }
    const row = map.get(key)!;
    if (d.companyId === companyId) row.companyMentions += d.count;
    else row.competitorMentions += d.count;
    row.total += d.count;
  });

  res.json(
    Array.from(map.values()).sort(
      (a, b) => b.companyMentions - a.companyMentions || b.total - a.total
    )
  );
});

export const sourcesRouter = router;
