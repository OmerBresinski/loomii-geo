import { z } from 'zod';
import { generateText, generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { prisma } from '@/utils/database';

const PROVIDERS = [
  {
    key: 'openai:gpt-4o',
    call: async (prompt: string) => {
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt,
        maxTokens: 1024,
      });
      return text;
    },
  },
] as const;

const ExtractionSchema = z.object({
  companyMentions: z.array(
    z.object({
      name: z.string(),
      domain: z.string(),
      sources: z.array(z.string().url()),
    })
  ),
});
type Extraction = z.infer<typeof ExtractionSchema>;

const SentimentSchema = z.object({
  sentiments: z.array(
    z.object({
      name: z.string(),
      domain: z.string(),
      sentiment: z.number().min(-1).max(1),
    })
  ),
});
type Sentiment = z.infer<typeof SentimentSchema>;

async function extractMentions(
  prompt: string,
  answer: string
): Promise<Extraction> {
  const { object } = await generateObject({
    schema: ExtractionSchema,
    model: openai.chat('gpt-4o-mini'),
    system:
      `You will receive a Q&A pair (PROMPT + RESPONSE). Identify **every company/product** mentioned in the RESPONSE. ` +
      `Return JSON → {companyMentions:[{name,domain,sources:string[]}]} (sources = list of distinct URLs).`,
    prompt: `PROMPT:\n${prompt}\n\nRESPONSE:\n${answer}`,
  });
  return object;
}

async function scoreSentiments(
  answer: string,
  companies: { name: string; domain: string }[]
): Promise<Sentiment> {
  const { object } = await generateObject({
    schema: SentimentSchema,
    model: openai.chat('gpt-4o-mini'),
    system:
      `Rate the overall sentiment toward each company on a −1 (very negative) to +1 (very positive) scale.\n` +
      `Return JSON {sentiments:[{name,domain,sentiment}]}.`,
    prompt:
      `ANSWER:\n${answer}\n\nCOMPANIES:\n` +
      companies.map(c => `${c.name} | ${c.domain}`).join('\n'),
  });

  return object;
}

const upsertProvider = async (name: string) =>
  (
    await prisma.aIProvider.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  ).id;

const upsertCompany = async (name: string, domain: string) =>
  (
    await prisma.company.upsert({
      where: { domain },
      update: {},
      create: { name, domain },
    })
  ).id;

export async function runDailyVisibilityJob() {
  const companies = await prisma.company.findMany({
    include: {
      topics: { include: { prompts: { where: { isActive: true } } } },
    },
  });

  for (const co of companies) {
    for (const topic of co.topics) {
      for (const prompt of topic.prompts) {
        for (const provider of PROVIDERS) {
          const answer = await provider.call(prompt.text);
          const mentionsResponse = await extractMentions(prompt.text, answer);
          const sentimentsResponse = await scoreSentiments(
            answer,
            mentionsResponse.companyMentions.map(({ name, domain }) => ({
              name,
              domain,
            }))
          );
          const sentimentMap = new Map(
            sentimentsResponse.sentiments.map(s => [
              s.domain || s.name,
              s.sentiment,
            ])
          );

          const promptRun = await prisma.promptRun.create({
            data: {
              promptId: prompt.id,
              providerId: await upsertProvider(provider.key),
              responseRaw: answer,
            },
          });

          for (const m of mentionsResponse.companyMentions) {
            const companyId = await upsertCompany(m.name, m.domain);
            const sentiment = sentimentMap.get(m.domain) ?? 0;

            await prisma.companyMention.create({
              data: {
                promptRunId: promptRun.id,
                companyId,
                visibilityPct: 100, // binary per-run
                sentiment,
              },
            });

            for (const url of m.sources) {
              const domain = new URL(url).hostname.replace(/^www\\./, '');
              const sourceId = (
                await prisma.source.upsert({
                  where: { domain },
                  create: { domain, name: domain.split('.')[0] },
                  update: {},
                })
              ).id;

              const sourceUrlId = (
                await prisma.sourceUrl.upsert({
                  where: { url },
                  create: { url, sourceId },
                  update: {},
                })
              ).id;

              await prisma.mentionDetail.create({
                data: {
                  promptRunId: promptRun.id,
                  companyId,
                  sourceUrlId,
                  count: 1, // presence flag
                },
              });
            }
          }
        }
      }
    }
  }
}
