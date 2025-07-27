import { Router } from 'express';
import { prisma } from '@/utils/database';
import { subDays } from 'date-fns';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(requireAuth);

router.get('/', async (req, res) => {
  const organizationId = req.auth?.organization?.id;
  const span = Number(((req.query.days as string) ?? '30').replace(/\D/g, ''));
  const since = subDays(new Date(), span);

  // Get the organization's company
  const company = await prisma.company.findFirst({
    where: { organizationId },
  });

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  // Get all prompts for this company with their runs and mentions
  const prompts = await prisma.prompt.findMany({
    where: { companyId: company.id },
    include: {
      promptTags: {
        include: {
          tag: true,
        },
      },
      promptRuns: {
        where: {
          runAt: {
            gte: since,
          },
        },
        include: {
          companyMentions: {
            include: {
              company: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Process each prompt to calculate metrics
  const promptData = prompts.map(prompt => {
    const totalRuns = prompt.promptRuns.length;

    // Calculate visibility for the organization's company
    const organizationMentions = prompt.promptRuns.filter(run =>
      run.companyMentions.some(mention => mention.companyId === company.id)
    ).length;

    const visibility =
      totalRuns > 0 ? (organizationMentions / totalRuns) * 100 : 0;

    // Calculate competitor visibility
    const competitorVisibility = new Map<
      number,
      {
        companyId: number;
        domain: string;
        mentions: number;
        visibility: number;
      }
    >();

    prompt.promptRuns.forEach(run => {
      run.companyMentions.forEach(mention => {
        if (mention.company.domain !== company.domain) {
          // Exclude the organization's own company
          const existing = competitorVisibility.get(mention.companyId) || {
            companyId: mention.companyId,
            domain: mention.company.domain,
            mentions: 0,
            visibility: 0,
          };
          existing.mentions += 1;
          existing.visibility =
            totalRuns > 0 ? (existing.mentions / totalRuns) * 100 : 0;
          competitorVisibility.set(mention.companyId, existing);
        }
      });
    });

    // Get top 5 competitors by visibility (excluding the logged-in company)
    const topCompetitors = Array.from(competitorVisibility.values())
      .sort((a, b) => b.visibility - a.visibility)
      .slice(0, 5)
      .map(comp => comp.domain);

    // Format tags
    const tags = prompt.promptTags.map(pt => ({
      id: pt.tag.id,
      label: pt.tag.label,
      color: pt.tag.color,
    }));

    return {
      promptId: prompt.id,
      text: prompt.text,
      visibility: Math.round(visibility * 100) / 100, // Round to 2 decimal places
      topCompetitorDomains: topCompetitors,
      tags,
      createdAt: prompt.createdAt,
      isActive: prompt.isActive,
      totalRuns,
    };
  });

  return res.json(promptData);
});

router.get('/runs/:promptId', async (req, res) => {
  const organizationId = req.auth?.organization?.id;
  const promptId = Number(req.params.promptId);

  if (!promptId || isNaN(promptId)) {
    return res
      .status(400)
      .json({ error: 'Valid promptId parameter is required' });
  }

  // Get the organization's company
  const company = await prisma.company.findFirst({
    where: { organizationId },
  });

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  // Verify the prompt belongs to this company
  const prompt = await prisma.prompt.findFirst({
    where: {
      id: promptId,
      companyId: company.id,
    },
  });

  if (!prompt) {
    return res.status(404).json({
      error: 'Prompt not found or does not belong to your organization',
    });
  }

  // Get all runs for this prompt with their mentions
  const promptRuns = await prisma.promptRun.findMany({
    where: { promptId },
    include: {
      companyMentions: {
        include: {
          company: true,
        },
      },
    },
    orderBy: {
      runAt: 'desc',
    },
  });

  // Process each run to calculate cumulative visibility up to that date
  const runData = promptRuns.map((currentRun, index) => {
    // Get all runs up to and including this date (reverse order since we ordered by desc)
    const runsUpToDate = promptRuns.slice(index);
    const totalRunsUpToDate = runsUpToDate.length;

    // Calculate organization visibility up to this date
    const organizationRunsWithMentions = runsUpToDate.filter(run =>
      run.companyMentions.some(
        mention =>
          mention.company.domain.toLowerCase() === company.domain.toLowerCase()
      )
    ).length;

    const organizationVisibility =
      totalRunsUpToDate > 0
        ? Math.round((organizationRunsWithMentions / totalRunsUpToDate) * 100)
        : 0;

    // Calculate competitor visibility up to this date
    const competitorVisibility = new Map<
      number,
      {
        companyId: number;
        companyName: string;
        companyDomain: string;
        runsWithMentions: number;
        visibility: number;
      }
    >();

    // Get all unique competitors mentioned up to this date
    runsUpToDate.forEach(run => {
      run.companyMentions.forEach(mention => {
        if (mention.company.domain !== company.domain) {
          if (!competitorVisibility.has(mention.companyId)) {
            competitorVisibility.set(mention.companyId, {
              companyId: mention.companyId,
              companyName: mention.company.name,
              companyDomain: mention.company.domain,
              runsWithMentions: 0,
              visibility: 0,
            });
          }
        }
      });
    });

    // Count runs where each competitor was mentioned
    for (const [companyId, competitor] of competitorVisibility.entries()) {
      const runsWithMentions = runsUpToDate.filter(run =>
        run.companyMentions.some(mention => mention.companyId === companyId)
      ).length;

      competitor.runsWithMentions = runsWithMentions;
      competitor.visibility =
        totalRunsUpToDate > 0
          ? Math.round((runsWithMentions / totalRunsUpToDate) * 100 * 100) / 100
          : 0;
    }

    // Get top 5 competitors by visibility
    const topCompetitors = Array.from(competitorVisibility.values())
      .sort((a, b) => b.visibility - a.visibility)
      .slice(0, 5)
      .map(competitor => ({
        companyId: competitor.companyId.toString(),
        companyName: competitor.companyName,
        companyDomain: competitor.companyDomain,
        visibility: competitor.visibility,
      }));

    return {
      runId: currentRun.id,
      runAt: currentRun.runAt,
      totalRuns: totalRunsUpToDate,
      organizationVisibility,
      topCompetitors,
    };
  });

  return res.json(runData);
});

export { router as promptsRouter };
