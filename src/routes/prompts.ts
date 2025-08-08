import { Router, Request, Response } from 'express';
import { prisma } from '@/utils/database';
import { subDays } from 'date-fns';
import { requireAuth } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { generateText, generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const organizationId = req.auth?.organization?.id;
  const span = Number(((req.query.days as string) ?? '30').replace(/\D/g, ''));
  const since = subDays(new Date(), span);

  const company = await prisma.company.findFirst({
    where: { organizationId },
  });

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

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

    // Calculate current visibility for the organization's company
    const organizationMentions = prompt.promptRuns.filter(run =>
      run.companyMentions.some(mention => mention.companyId === company.id)
    ).length;

    const visibility =
      totalRuns > 0 ? (organizationMentions / totalRuns) * 100 : 0;

    // Calculate trend by comparing cumulative averages
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPercentage = 0;

    if (totalRuns >= 2) {
      // Sort runs by date (newest first)
      const sortedRuns = [...prompt.promptRuns].sort(
        (a, b) => b.runAt.getTime() - a.runAt.getTime()
      );

      // Cumulative visibility up to and including latest run (all runs)
      const allRuns = sortedRuns.length;
      const allMentions = sortedRuns.filter(run =>
        run.companyMentions.some(mention => mention.companyId === company.id)
      ).length;
      const latestCumulativeVisibility =
        allRuns > 0 ? (allMentions / allRuns) * 100 : 0;

      // Cumulative visibility up to (but excluding) latest run
      const runsExcludingLatest = sortedRuns.slice(1); // Remove the first (latest) run
      const mentionsExcludingLatest = runsExcludingLatest.filter(run =>
        run.companyMentions.some(mention => mention.companyId === company.id)
      ).length;
      const previousCumulativeVisibility =
        runsExcludingLatest.length > 0
          ? (mentionsExcludingLatest / runsExcludingLatest.length) * 100
          : 0;

      // Calculate trend
      const visibilityDifference =
        latestCumulativeVisibility - previousCumulativeVisibility;

      if (Math.abs(visibilityDifference) >= 1) {
        // 1% threshold
        trend = visibilityDifference > 0 ? 'up' : 'down';
      }

      trendPercentage = Math.abs(Math.round(visibilityDifference * 100) / 100);
    }

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
      .map(comp => {
        // Find the actual company name from the mentions data
        const companyMention = prompt.promptRuns
          .flatMap(run => run.companyMentions)
          .find(mention => mention.companyId === comp.companyId);
        
        return {
          name: companyMention?.company.name || comp.domain.split('.')[0],
          domain: comp.domain,
        };
      });

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
      trend,
      trendPercentage,
      topCompetitors,
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

    // Calculate organization sentiment up to this date
    const organizationSentiments: number[] = [];
    runsUpToDate.forEach(run => {
      run.companyMentions.forEach(mention => {
        if (
          mention.company.domain.toLowerCase() === company.domain.toLowerCase()
        ) {
          organizationSentiments.push(mention.sentiment);
        }
      });
    });

    const organizationSentiment =
      organizationSentiments.length > 0
        ? Math.round(
            (organizationSentiments.reduce((sum, s) => sum + s, 0) /
              organizationSentiments.length) *
              100
          ) / 100
        : 0;

    // Calculate competitor visibility and sentiment up to this date
    const competitorData = new Map<
      number,
      {
        companyId: number;
        companyName: string;
        companyDomain: string;
        runsWithMentions: number;
        visibility: number;
        sentiments: number[];
        averageSentiment: number;
      }
    >();

    // Get all unique competitors mentioned up to this date and collect their sentiments
    runsUpToDate.forEach(run => {
      run.companyMentions.forEach(mention => {
        if (mention.company.domain !== company.domain) {
          if (!competitorData.has(mention.companyId)) {
            competitorData.set(mention.companyId, {
              companyId: mention.companyId,
              companyName: mention.company.name,
              companyDomain: mention.company.domain,
              runsWithMentions: 0,
              visibility: 0,
              sentiments: [],
              averageSentiment: 0,
            });
          }
          // Add sentiment to the competitor
          competitorData
            .get(mention.companyId)!
            .sentiments.push(mention.sentiment);
        }
      });
    });

    // Count runs where each competitor was mentioned and calculate average sentiment
    for (const [companyId, competitor] of competitorData.entries()) {
      const runsWithMentions = runsUpToDate.filter(run =>
        run.companyMentions.some(mention => mention.companyId === companyId)
      ).length;

      competitor.runsWithMentions = runsWithMentions;
      competitor.visibility =
        totalRunsUpToDate > 0
          ? Math.round((runsWithMentions / totalRunsUpToDate) * 100 * 100) / 100
          : 0;

      competitor.averageSentiment =
        competitor.sentiments.length > 0
          ? Math.round(
              (competitor.sentiments.reduce((sum, s) => sum + s, 0) /
                competitor.sentiments.length) *
                100
            ) / 100
          : 0;
    }

    // Get top 5 competitors by visibility
    const topCompetitors = Array.from(competitorData.values())
      .sort((a, b) => b.visibility - a.visibility)
      .slice(0, 5)
      .map(competitor => ({
        companyId: competitor.companyId.toString(),
        companyName: competitor.companyName,
        companyDomain: competitor.companyDomain,
        visibility: competitor.visibility,
        averageSentiment: competitor.averageSentiment,
      }));

    return {
      runId: currentRun.id,
      runAt: currentRun.runAt,
      totalRuns: totalRunsUpToDate,
      organizationVisibility,
      organizationSentiment,
      topCompetitors,
    };
  });

  return res.json(runData);
});

// POST /prompts - Create a new prompt
router.post(
  '/',
  [
    body('text')
      .trim()
      .notEmpty()
      .withMessage('Prompt text is required')
      .isLength({ min: 10, max: 500 })
      .withMessage('Prompt text must be between 10 and 500 characters'),
    body('tagIds')
      .optional()
      .isArray()
      .withMessage('Tag IDs must be an array')
      .custom(tagIds => {
        if (
          tagIds &&
          tagIds.some((id: any) => !Number.isInteger(id) || id <= 0)
        ) {
          throw new Error('All tag IDs must be positive integers');
        }
        return true;
      }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array().map(err => ({
          field: err.type === 'field' ? err.path : 'unknown',
          message: err.msg,
        })),
      });
    }

    const organizationId = req.auth?.organization?.id;
    const { text, tagIds } = req.body;

    try {
      // Get the organization's company
      const company = await prisma.company.findFirst({
        where: { organizationId },
      });

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Check prompt limit (20 prompts per organization)
      const currentPromptCount = await prisma.prompt.count({
        where: { companyId: company.id },
      });

      const PROMPT_LIMIT = 20;
      if (currentPromptCount >= PROMPT_LIMIT) {
        return res.status(400).json({
          error: 'Prompt limit exceeded',
          message: `You have reached the maximum limit of ${PROMPT_LIMIT} prompts per organization`,
          details: {
            currentCount: currentPromptCount,
            maxLimit: PROMPT_LIMIT,
          },
        });
      }

      // Validate that all provided tag IDs exist
      if (tagIds && tagIds.length > 0) {
        const existingTags = await prisma.tag.findMany({
          where: { id: { in: tagIds } },
          select: { id: true },
        });

        const existingTagIds = existingTags.map(tag => tag.id);
        const invalidTagIds = tagIds.filter(
          (id: number) => !existingTagIds.includes(id)
        );

        if (invalidTagIds.length > 0) {
          return res.status(400).json({
            error: 'Invalid tag IDs',
            details: `Tag IDs ${invalidTagIds.join(', ')} do not exist`,
          });
        }
      }

      // Create the prompt with tag associations
      const prompt = await prisma.prompt.create({
        data: {
          text,
          companyId: company.id,
          isActive: true,
          promptTags:
            tagIds && tagIds.length > 0
              ? {
                  create: tagIds.map((tagId: number) => ({
                    tagId,
                  })),
                }
              : undefined,
        },
        include: {
          promptTags: {
            include: {
              tag: true,
            },
          },
        },
      });

      // Format the response to match the interface
      const response = {
        promptId: prompt.id,
        text: prompt.text,
        isActive: prompt.isActive,
        createdAt: prompt.createdAt,
        tags: prompt.promptTags.map(pt => ({
          id: pt.tag.id,
          label: pt.tag.label,
          color: pt.tag.color,
        })),
      };

      return res.status(201).json(response);
    } catch (error) {
      console.error('Error creating prompt:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create prompt',
      });
    }
  }
);

// GET /prompts/usage - Get prompt usage stats for progress bar
router.get('/usage', async (req: Request, res: Response) => {
  const organizationId = req.auth?.organization?.id;

  try {
    // Get the organization's company
    const company = await prisma.company.findFirst({
      where: { organizationId },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Count current prompts
    const currentCount = await prisma.prompt.count({
      where: { companyId: company.id },
    });

    const maxLimit = 20;
    const remainingCount = maxLimit - currentCount;
    const usagePercentage = Math.round((currentCount / maxLimit) * 100);

    return res.json({
      currentCount,
      maxLimit,
      remainingCount,
      usagePercentage,
      canCreateMore: currentCount < maxLimit,
    });
  } catch (error) {
    console.error('Error fetching prompt usage:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch prompt usage',
    });
  }
});

// GET /prompts/tags - Get all available tags
router.get('/tags', async (req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { label: 'asc' },
    });

    return res.json({ tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch tags',
    });
  }
});

// GET /prompts/suggestPrompts - Get AI-generated company analysis for prompt suggestions
router.get('/suggestPrompts', async (req: Request, res: Response) => {
  try {
    const organizationId = req.auth?.organization?.id;

    if (!organizationId) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { summary: true },
    });

    if (!organization) {
      return res.status(404).json({
        error: 'Organization not found',
      });
    }

    let companyAnalysis: string;

    // Check if we already have a cached analysis
    if (organization.summary) {
      console.log('Using cached organization analysis');
      companyAnalysis = organization.summary.analysis;
    } else {
      // Step 1: Analyze the company
      console.log('Generating new organization analysis');
      const { text } = await generateText({
        model: google('gemini-2.5-flash'),
        tools: {
          google_search: google.tools.googleSearch({}),
        },
        system: `You are a business analyst expert. Analyze companies by visiting their website and provide comprehensive business intelligence. Always be factual and thorough.`,
        prompt: `Please analyze the company website at ${organization.domain} and provide a detailed analysis with the following information:

1. COMPANY DESCRIPTION: What does this company do? What are their main products/services? What is their business model? What industry are they in? Be very detailed and thorough.

2. PRIMARY OPERATING COUNTRY: In which country does this company primarily operate? Where is their main market focus?

3. COMPANY TYPE: What type of company is this? (e.g., B2B SaaS, E-commerce, Consulting, Manufacturing, Healthcare, Fintech, etc.)

4. KEY BUSINESS AREAS: What are their main business verticals or focus areas?

5. TARGET AUDIENCE: Who are their primary customers or target market?

Please be comprehensive and provide as much detail as possible about the company's operations, services, and market position.

Company domain to analyze: ${organization.domain}`,
        maxOutputTokens: 2048,
        temperature: 0.2,
      });

      companyAnalysis = text;

      // Save the analysis to the database
      await prisma.organizationSummary.create({
        data: {
          organizationId: organization.id,
          analysis: companyAnalysis,
        },
      });
    }

    // Step 2: Get available tags for suggestion
    const availableTags = await prisma.tag.findMany({
      orderBy: { label: 'asc' },
    });

    // Step 3: Generate prompt suggestions with tag recommendations
    const promptSuggestionsSchema = z.object({
      prompts: z.array(z.object({
        text: z.string(),
        suggestedTagIds: z.array(z.number()).optional(),
      })).min(20).max(20),
    });

    const { object: promptSuggestions } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: promptSuggestionsSchema,
      system: `You are an expert in Generative Engine Optimization (GEO) and AI-driven search monitoring. Your task is to generate 20 high-value prompt suggestions for users to input into a GEO tracking system. These prompts should be designed to help organizations monitor their visibility, competitor presence, and sentiment in responses from generative AI providers (e.g., ChatGPT, Gemini, Grok, Perplexity).

You will be provided with extracted data about the organization, including details like company name, industry/field, location, key products/services, target audience, and any notable competitors or unique selling points (USPs) inferred from their domain URL.

Using this data, create prompts that are:

1. Natural, conversational queries that mimic real user searches in AI systems.
2. Diverse: Include a mix of:
   - Unbranded queries (industry or need-based, to check organic visibility).
   - Product/service-specific.
   - Sentiment-oriented (e.g., pros/cons, reviews).
   - Trend or top-list related (e.g., top companies in a field).
   - Long-tail queries for niche insights.
3. NEVER USE ANY COMPANY NAMES OR BRANDS in the prompts. Focus on generic industry terms or needs.
4. Relevant and valuable for GEO tracking: Each prompt should help reveal how the company appears in AI outputs (e.g., mentions, rankings, citations, positive/negative tones).
5. Ensure that every prompt is crafted to elicit responses from AI providers that include lists or rankings of companies in one way or another, such as top lists, recommendations, comparisons, best-of categories, alternatives, or market leaders. Avoid any prompts that would yield general advice, instructions, non-comparative insights, or responses without mentioning specific companies.
6. CRITICAL: Analyze the company data to determine the country/region. If the organization is from a non-English speaking country (Israel, Germany, France, Spain, Italy, Netherlands, Japan, South Korea, etc.), you MUST include the country identifier in EVERY prompt. Examples:
   - "Top Israeli fintech companies for small businesses"
   - "Best German manufacturing software providers" 
   - "Leading French e-commerce platforms"
   - "Which Japanese companies offer the best..."
   If the company is from an English-speaking country (US, UK, Canada, Australia), create generic prompts without country identifiers.
7. For each prompt, suggest relevant tags from the available tag options. Analyze the prompt content and select 1-3 most relevant tag IDs. If no tags are relevant, leave suggestedTagIds empty.
8. Return exactly 20 prompts in the prompts array with their suggested tags. Ensure variety to cover different aspects like market share, customer pain points, innovation, and emerging trends.

AVAILABLE TAGS:
${availableTags.map(tag => `ID: ${tag.id}, Label: "${tag.label}"`).join('\n')}

Return format: Each prompt should have:
- text: The prompt text
- suggestedTagIds: Array of relevant tag IDs (1-3 tags max, can be empty)`,
      prompt: companyAnalysis,
      temperature: 0.3,
    });

    // Add tag details to the response
    const promptsWithTagDetails = promptSuggestions.prompts.map(prompt => ({
      text: prompt.text,
      suggestedTags: prompt.suggestedTagIds ? 
        availableTags.filter(tag => prompt.suggestedTagIds!.includes(tag.id)) : [],
    }));

    return res.json({
      organizationDomain: organization.domain,
      organizationName: organization.name,
      analysis: companyAnalysis,
      prompts: promptsWithTagDetails,
      availableTags: availableTags,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating company analysis:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate company analysis',
    });
  }
});

// POST /prompts/bulk - Create multiple prompts at once
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const organizationId = req.auth?.organization?.id;

    if (!organizationId) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const { prompts } = req.body;

    // Validate request body
    if (!Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Prompts array is required and must not be empty',
      });
    }

    if (prompts.length > 20) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Cannot create more than 20 prompts at once',
      });
    }

    // Validate each prompt
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      if (!prompt.text || typeof prompt.text !== 'string') {
        return res.status(400).json({
          error: 'Validation failed',
          message: `Prompt at index ${i} must have a text field`,
        });
      }
      if (prompt.text.trim().length < 10 || prompt.text.trim().length > 500) {
        return res.status(400).json({
          error: 'Validation failed',
          message: `Prompt at index ${i} text must be between 10 and 500 characters`,
        });
      }
      if (prompt.tagIds && !Array.isArray(prompt.tagIds)) {
        return res.status(400).json({
          error: 'Validation failed',
          message: `Prompt at index ${i} tagIds must be an array`,
        });
      }
    }

    // Get the organization's company
    const company = await prisma.company.findFirst({
      where: { organizationId },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check current prompt count and total limit
    const currentPromptCount = await prisma.prompt.count({
      where: { companyId: company.id },
    });

    const PROMPT_LIMIT = 20;
    if (currentPromptCount + prompts.length > PROMPT_LIMIT) {
      return res.status(400).json({
        error: 'Prompt limit exceeded',
        message: `Cannot create ${prompts.length} prompts. Current count: ${currentPromptCount}, limit: ${PROMPT_LIMIT}`,
        details: {
          currentCount: currentPromptCount,
          requestedCount: prompts.length,
          maxLimit: PROMPT_LIMIT,
          availableSlots: PROMPT_LIMIT - currentPromptCount,
        },
      });
    }

    // Validate all tag IDs if provided
    const allTagIds = prompts
      .filter(p => p.tagIds && p.tagIds.length > 0)
      .flatMap(p => p.tagIds);
    
    if (allTagIds.length > 0) {
      const existingTags = await prisma.tag.findMany({
        where: { id: { in: allTagIds } },
        select: { id: true },
      });

      const existingTagIds = existingTags.map(tag => tag.id);
      const invalidTagIds = allTagIds.filter(id => !existingTagIds.includes(id));

      if (invalidTagIds.length > 0) {
        return res.status(400).json({
          error: 'Invalid tag IDs',
          message: `Tag IDs ${invalidTagIds.join(', ')} do not exist`,
        });
      }
    }

    // Create prompts in bulk
    const results = {
      created: 0,
      failed: 0,
      errors: [] as Array<{ prompt: string; error: string }>,
      prompts: [] as any[],
    };

    await prisma.$transaction(async (tx) => {
      for (const promptData of prompts) {
        try {
          const prompt = await tx.prompt.create({
            data: {
              text: promptData.text.trim(),
              companyId: company.id,
              isActive: true,
              promptTags:
                promptData.tagIds && promptData.tagIds.length > 0
                  ? {
                      create: promptData.tagIds.map((tagId: number) => ({
                        tagId,
                      })),
                    }
                  : undefined,
            },
            include: {
              promptTags: {
                include: {
                  tag: true,
                },
              },
            },
          });

          results.prompts.push({
            promptId: prompt.id,
            text: prompt.text,
            isActive: prompt.isActive,
            createdAt: prompt.createdAt,
            tags: prompt.promptTags.map(pt => ({
              id: pt.tag.id,
              label: pt.tag.label,
              color: pt.tag.color,
            })),
          });

          results.created++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            prompt: promptData.text,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    });

    return res.status(201).json({
      success: results.failed === 0,
      created: results.created,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
      prompts: results.prompts,
    });

  } catch (error) {
    console.error('Error creating bulk prompts:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create prompts',
    });
  }
});

export { router as promptsRouter };
