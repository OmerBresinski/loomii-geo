import { Router } from 'express';
import { prisma } from '@/utils/database';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(requireAuth);

router.get('/', async (req, res) => {
  const organizationId = req.auth?.organization?.id;
  const sources = await prisma.source.findMany({
    include: {
      urls: {
        include: {
          _count: {
            select: {
              mentionDetails: {
                where: {
                  promptRun: {
                    prompt: {
                      topic: {
                        company: {
                          organizationId,
                        },
                      },
                    },
                  },
                },
              },
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
    urls: source.urls.map(url => ({
      id: url.id,
      url: url.url,
      mentionCount: url._count.mentionDetails,
    })),
    totalMentions: source.urls.reduce(
      (sum, url) => sum + url._count.mentionDetails,
      0
    ),
  }));

  res.json(payload);
});

export { router as sourcesRouter };
