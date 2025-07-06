import { Router } from 'express';
import { prisma } from '@/utils/database';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(requireAuth);

router.get('/', async (req, res) => {
  const organizationId = req.auth?.organization?.id;
  const span = Number(((req.query.days as string) ?? '30').replace(/\D/g, ''));

  // First, get the user's company through their organization
  const userCompany = await prisma.company.findUnique({
    where: { organizationId },
  });

  if (!userCompany) {
    return res
      .status(404)
      .json({ error: 'Company not found for this organization' });
  }

  const sources = await prisma.source.findMany({
    include: {
      urls: {
        include: {
          mentionDetails: {
            where: {
              promptRun: {
                runAt: {
                  gte: new Date(Date.now() - span * 24 * 60 * 60 * 1000),
                },
              },
            },
            include: {
              company: true,
            },
          },
        },
      },
    },
  });

  const payload = sources
    .map(source => ({
      id: source.id,
      name: source.name,
      domain: source.domain,
      urlCount: source.urls.length,
      urls: source.urls.map(url => {
        const totalMentions = url.mentionDetails.length;
        const companyMentions = url.mentionDetails.filter(
          detail => detail.companyId === userCompany.id
        ).length;

        return {
          id: url.id,
          url: url.url,
          totalMentions,
          companyMentions,
          mentionPercentage:
            totalMentions > 0
              ? ((companyMentions / totalMentions) * 100).toFixed(1)
              : '0.0',
        };
      }),
      totalMentions: source.urls.reduce(
        (sum, url) => sum + url.mentionDetails.length,
        0
      ),
      totalCompanyMentions: source.urls.reduce(
        (sum, url) =>
          sum +
          url.mentionDetails.filter(
            detail => detail.companyId === userCompany.id
          ).length,
        0
      ),
    }))
    .sort((a, b) => b.totalCompanyMentions - a.totalCompanyMentions);

  return res.json(payload);
});

export { router as sourcesRouter };
