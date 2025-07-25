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
    
    const visibility = totalRuns > 0 ? (organizationMentions / totalRuns) * 100 : 0;

    // Calculate competitor visibility
    const competitorVisibility = new Map<number, { 
      companyId: number; 
      domain: string;
      mentions: number; 
      visibility: number; 
    }>();

    prompt.promptRuns.forEach(run => {
      run.companyMentions.forEach(mention => {
        if (mention.companyId !== company.id) { // Exclude the organization's own company
          const existing = competitorVisibility.get(mention.companyId) || {
            companyId: mention.companyId,
            domain: mention.company.domain,
            mentions: 0,
            visibility: 0,
          };
          existing.mentions += 1;
          existing.visibility = totalRuns > 0 ? (existing.mentions / totalRuns) * 100 : 0;
          competitorVisibility.set(mention.companyId, existing);
        }
      });
    });

    // Get top 3 competitors by visibility
    const topCompetitors = Array.from(competitorVisibility.values())
      .sort((a, b) => b.visibility - a.visibility)
      .slice(0, 3)
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

export { router as promptsRouter };