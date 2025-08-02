import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../utils/database';
import { z } from 'zod';

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(requireAuth);

const chatsQuerySchema = z.object({
  page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 10),
  promptId: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined)
}).refine(
  (data) => data.page >= 1 && data.limit >= 1 && data.limit <= 100,
  {
    message: "Page must be >= 1, limit must be between 1 and 100"
  }
);

// GET /api/chats - Get paginated AI chat responses for the authenticated user's company
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
    const validatedQuery = chatsQuerySchema.parse(req.query);
    const { page, limit, promptId } = validatedQuery;
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

    // Build where clause for prompt runs
    const whereClause: any = {
      prompt: {
        companyId: companyId
      }
    };

    // If promptId is specified, filter by that specific prompt
    if (promptId) {
      whereClause.promptId = promptId;
    }

    // Get all prompt runs for the user's company with pagination
    const [promptRuns, totalCount] = await Promise.all([
      prisma.promptRun.findMany({
        where: whereClause,
        include: {
          prompt: {
            select: {
              id: true,
              text: true,
              createdAt: true,
              promptTags: {
                include: {
                  tag: {
                    select: {
                      id: true,
                      label: true,
                      color: true
                    }
                  }
                }
              }
            }
          },
          provider: {
            select: {
              id: true,
              name: true
            }
          },
          companyMentions: {
            include: {
              company: {
                select: {
                  id: true,
                  name: true,
                  domain: true
                }
              }
            }
          }
        },
        orderBy: {
          runAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.promptRun.count({
        where: whereClause
      })
    ]);

    // Process the data to include additional computed fields
    const chats = promptRuns.map(run => {
      // Check if the logged-in company was mentioned in this response
      const companyMentioned = run.companyMentions.some(
        mention => mention.companyId === companyId
      );

      // Get sentiment for the logged-in company if mentioned
      const companySentiment = run.companyMentions.find(
        mention => mention.companyId === companyId
      )?.sentiment || null;

      // Count total companies mentioned
      const totalCompaniesmentioned = run.companyMentions.length;

      // Format tags
      const tags = run.prompt.promptTags.map(pt => ({
        id: pt.tag.id,
        label: pt.tag.label,
        color: pt.tag.color,
      }));

      return {
        id: run.id,
        promptId: run.promptId,
        responseText: run.responseRaw,
        runAt: run.runAt,
        prompt: {
          id: run.prompt.id,
          text: run.prompt.text,
          createdAt: run.prompt.createdAt,
          tags: tags
        },
        aiProvider: run.provider,
        companyMentioned,
        companySentiment,
        totalCompaniesmentioned,
        mentionedCompanies: run.companyMentions.map(mention => ({
          id: mention.company.id,
          name: mention.company.name,
          domain: mention.company.domain,
          sentiment: mention.sentiment
        }))
      };
    });

    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.json({
      success: true,
      data: {
        chats,
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
    
    console.error('Error fetching chats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export { router as chatsRouter };