import { Router } from 'express';
import { prisma } from '@/utils/database';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(requireAuth);

router.get('/', async (req, res) => {
  const organizationId = req.auth?.organization?.id;
  const span = Number(((req.query.days as string) ?? '30').replace(/\D/g, ''));
  
  // Pagination parameters
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20)); // Default 20, max 100
  const offset = (page - 1) * limit;

  // First, get the user's company through their organization
  const userCompany = await prisma.company.findUnique({
    where: { organizationId },
  });

  if (!userCompany) {
    return res
      .status(404)
      .json({ error: 'Company not found for this organization' });
  }

  // Get total number of prompt runs for this organization in the time span
  const totalPromptRuns = await prisma.promptRun.count({
    where: {
      prompt: {
        companyId: userCompany.id,
      },
      runAt: {
        gte: new Date(Date.now() - span * 24 * 60 * 60 * 1000),
      },
    },
  });

  // Get sources that have mentions from this organization's prompts only
  const sources = await prisma.source.findMany({
    where: {
      urls: {
        some: {
          mentionDetails: {
            some: {
              promptRun: {
                prompt: {
                  companyId: userCompany.id, // Only sources from this org's prompts
                },
                runAt: {
                  gte: new Date(Date.now() - span * 24 * 60 * 60 * 1000),
                },
              },
            },
          },
        },
      },
    },
    include: {
      urls: {
        include: {
          mentionDetails: {
            where: {
              promptRun: {
                prompt: {
                  companyId: userCompany.id, // Filter mention details to this org only
                },
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
    .map(source => {
      // Calculate mention statistics for this source
      let totalMentions = 0;
      let organizationMentions = 0;
      let competitorMentions = 0;

      // Get unique prompt runs that used this source
      const uniquePromptRunIds = new Set<number>();
      source.urls.forEach(url => {
        url.mentionDetails.forEach(detail => {
          uniquePromptRunIds.add(detail.promptRunId);
        });
      });
      const promptRunsUsingSource = uniquePromptRunIds.size;

      const urlDetails = source.urls
        .map(url => {
          const urlTotalMentions = url.mentionDetails.length;
          const urlOrganizationMentions = url.mentionDetails.filter(
            detail => detail.companyId === userCompany.id
          ).length;
          const urlCompetitorMentions =
            urlTotalMentions - urlOrganizationMentions;

          // Add to source totals
          totalMentions += urlTotalMentions;
          organizationMentions += urlOrganizationMentions;
          competitorMentions += urlCompetitorMentions;

          // Extract path from URL for better display
          let path = '/';
          try {
            const urlObj = new URL(url.url);
            path = urlObj.pathname + urlObj.search + urlObj.hash;
          } catch {
            path = url.url; // Fallback to full URL if parsing fails
          }

          return {
            id: url.id,
            url: url.url,
            path: path,
            totalMentions: urlTotalMentions,
            organizationMentions: urlOrganizationMentions,
            competitorMentions: urlCompetitorMentions,
            mentionPercentage:
              urlTotalMentions > 0
                ? Math.round((urlOrganizationMentions / urlTotalMentions) * 100)
                : 0,
          };
        })
        .filter(url => url.totalMentions > 0); // Only include URLs with mentions

      return {
        id: source.id,
        name: source.name,
        domain: source.domain,
        totalMentions,
        organizationMentions,
        competitorMentions,
        urlCount: urlDetails.length,
        organizationMentionPercentage:
          totalMentions > 0
            ? Math.round((organizationMentions / totalMentions) * 100)
            : 0,
        usedFrequency:
          totalPromptRuns > 0
            ? Math.round((promptRunsUsingSource / totalPromptRuns) * 100)
            : 0,
        urls: urlDetails.sort((a, b) => {
          // Sort URLs by organization mentions first, then competitor mentions
          if (b.organizationMentions !== a.organizationMentions) {
            return b.organizationMentions - a.organizationMentions;
          }
          return b.competitorMentions - a.competitorMentions;
        }),
      };
    })
    .filter(source => source.totalMentions > 0) // Only include sources with mentions
    .sort((a, b) => {
      // Primary sort: used frequency (descending)
      if (b.usedFrequency !== a.usedFrequency) {
        return b.usedFrequency - a.usedFrequency;
      }
      // Secondary sort: organization mentions (descending)
      if (b.organizationMentions !== a.organizationMentions) {
        return b.organizationMentions - a.organizationMentions;
      }
      // Tertiary sort: competitor mentions (descending)
      return b.competitorMentions - a.competitorMentions;
    });

  // Apply pagination
  const totalSources = payload.length;
  const paginatedSources = payload.slice(offset, offset + limit);
  const totalPages = Math.ceil(totalSources / limit);

  return res.json({
    data: paginatedSources,
    pagination: {
      page,
      limit,
      totalSources,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  });
});

export { router as sourcesRouter };
