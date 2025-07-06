import { Router } from 'express';
import { prisma } from '@/utils/database';
import { subDays } from 'date-fns';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(requireAuth);

router.get('/', async (req, res) => {
  const organizationId = req.auth?.organization?.id;
  const company = await prisma.company.findFirst({
    where: { organizationId },
  });
  console.log({ company });
  const span = Number(((req.query.days as string) ?? '30').replace(/\D/g, ''));
  const since = subDays(new Date(), span);

  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  // Get topic-level metrics using raw SQL for better performance
  const topicMetrics = (await prisma.$queryRaw`
    SELECT 
      t.id as "topicId",
      t.name as "topicName",
      CASE 
        WHEN COUNT(pr.id) > 0 THEN 
          ROUND((COUNT(CASE WHEN c.domain = ${company.domain} THEN cm.id END)::DECIMAL / COUNT(pr.id)) * 100, 2)
        ELSE 0 
      END as visibility,
      COALESCE(AVG(CASE WHEN c.domain = ${company.domain} THEN cm.sentiment END), 0) as sentiment
    FROM "Topic" t
    LEFT JOIN "Prompt" p ON t.id = p."topicId"
    LEFT JOIN "PromptRun" pr ON p.id = pr."promptId" 
      AND pr."runAt" >= ${since}
    LEFT JOIN "CompanyMention" cm ON pr.id = cm."promptRunId"
    LEFT JOIN "Company" c ON cm."companyId" = c.id
    WHERE t."companyId" = ${company.id}
    GROUP BY t.id, t.name
    ORDER BY visibility DESC
  `) as Array<{
    topicId: number;
    topicName: string;
    visibility: number;
    sentiment: number;
  }>;

  console.log({ topicMetrics });

  // Get prompt-level metrics for each topic
  const promptMetrics = (await prisma.$queryRaw`
    SELECT 
      p.id as "promptId",
      p.text as "promptText",
      p."topicId",
      CASE 
        WHEN COUNT(pr.id) > 0 THEN 
          ROUND((COUNT(CASE WHEN c.domain = ${company.domain} THEN cm.id END)::DECIMAL / COUNT(pr.id)) * 100, 2)
        ELSE 0 
      END as visibility,
      COALESCE(AVG(CASE WHEN c.domain = ${company.domain} THEN cm.sentiment END), 0) as sentiment
    FROM "Prompt" p
    LEFT JOIN "PromptRun" pr ON p.id = pr."promptId" 
      AND pr."runAt" >= ${since}
    LEFT JOIN "CompanyMention" cm ON pr.id = cm."promptRunId"
    LEFT JOIN "Company" c ON cm."companyId" = c.id
    WHERE p."topicId" IN (
      SELECT id FROM "Topic" WHERE "companyId" = ${company.id}
    )
    GROUP BY p.id, p.text, p."topicId"
    ORDER BY p."topicId", visibility DESC
  `) as Array<{
    promptId: number;
    promptText: string;
    topicId: number;
    visibility: number;
    sentiment: number;
  }>;

  console.log({ promptMetrics });

  // Combine the results
  const payload = topicMetrics.map(topic => ({
    topicId: topic.topicId,
    topicName: topic.topicName,
    visibility: +topic.visibility.toFixed(2),
    sentiment: +topic.sentiment.toFixed(2),
    prompts: promptMetrics
      .filter(prompt => prompt.topicId === topic.topicId)
      .map(prompt => ({
        promptId: prompt.promptId,
        promptText: prompt.promptText,
        visibility: +prompt.visibility.toFixed(2),
        sentiment: +prompt.sentiment.toFixed(2),
      })),
  }));

  console.log(JSON.stringify(payload, null, 2));

  return res.json(payload);
});

export { router as analyticsRouter };
