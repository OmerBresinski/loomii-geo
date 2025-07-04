import { Router } from 'express';
import { prisma } from '@/utils/database';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(requireAuth);

router.get('/', async (req, res) => {
  const sources = await prisma.source.findMany({
    include: {
      urls: {
        include: {
          _count: {
            select: {
              mentionDetails: true,
            },
          },
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  const payload = sources.map(source => ({
    id: source.id,
    name: source.name,
    domain: source.domain,
    urlCount: source.urls.length,
    totalMentions: source.urls.reduce(
      (sum, url) => sum + url._count.mentionDetails,
      0
    ),
  }));

  res.json(payload);
});

export { router as sourcesRouter };
