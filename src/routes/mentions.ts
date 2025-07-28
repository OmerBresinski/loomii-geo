import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../utils/database';
import { z } from 'zod';

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(requireAuth);

const mentionsQuerySchema = z.object({
  page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 10)
}).refine(
  (data) => data.page >= 1 && data.limit >= 1 && data.limit <= 100,
  {
    message: "Page must be >= 1, limit must be between 1 and 100"
  }
);

// GET /api/mentions - Get paginated mentions for the authenticated user's company
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.auth?.organization?.id) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Validate query parameters
    const validatedQuery = mentionsQuerySchema.parse(req.query);
    const { page, limit } = validatedQuery;
    const skip = (page - 1) * limit;

    // First, get the user's company
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      include: { 
        organization: {
          include: {
            company: true
          }
        }
      }
    });

    if (!user?.organization?.company) {
      res.status(404).json({
        success: false,
        error: 'Company not found for user organization',
      });
      return;
    }

    const companyId = user.organization.company.id;

    // Get mentions for the user's company with pagination
    const [mentions, totalCount] = await Promise.all([
      prisma.mention.findMany({
        where: {
          companyId: companyId
        },
        include: {
          prompt: {
            select: {
              id: true,
              text: true,
              createdAt: true
            }
          },
          aiProvider: {
            select: {
              id: true,
              name: true
            }
          },
          company: {
            select: {
              id: true,
              name: true,
              domain: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.mention.count({
        where: {
          companyId: companyId
        }
      })
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.json({
      success: true,
      data: {
        mentions,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext,
          hasPrev
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors
      });
      return;
    }
    
    console.error('Error fetching mentions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export { router as mentionsRouter };