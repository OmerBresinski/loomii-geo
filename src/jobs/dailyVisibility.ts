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

/**
 *  Main cron – run daily (e.g. Vercel Cron 07:00 UTC)                   *
 * --------------------------------------------------------------------- */
export async function runDailyVisibilityJob() {
  console.log('🚀 Starting daily visibility job...');
  const companies = await prisma.company.findMany({
    include: {
      topics: { include: { prompts: { where: { isActive: true } } } },
    },
  });
  console.log(`Found ${companies.length} companies to process.`);

  for (const co of companies) {
    console.log(`\n🏢 Processing company: ${co.name}`);
    for (const topic of co.topics) {
      console.log(`  📚 Processing topic: ${topic.name}`);
      for (const prompt of topic.prompts) {
        console.log(`    💬 Processing prompt: "${prompt.text}"`);
        for (const provider of PROVIDERS) {
          console.log(`      🤖 Using provider: ${provider.key}`);
          // 0 · get the model's answer
          console.log('      [1/4] Getting response from AI provider...');
          const answer = await provider.call(prompt.text);

          // 1 · extract companies + URLs
          console.log('      [2/4] Extracting company mentions...');
          const ext = await extractMentions(prompt.text, answer);
          console.log(
            `      Found ${ext.companyMentions.length} company mentions.`
          );

          // 2 · score sentiment per company
          console.log('      [3/4] Scoring sentiments...');
          const sent = await scoreSentiments(
            answer,
            ext.companyMentions.map(({ name, domain }) => ({ name, domain }))
          );
          const sentimentMap = new Map(
            sent.sentiments.map(s => [s.domain || s.name, s.sentiment])
          );
          console.log(`      Scored ${sent.sentiments.length} sentiments.`);

          // 3 · persist PromptRun
          console.log('      [4/4] Persisting data to database...');
          const promptRun = await prisma.promptRun.create({
            data: {
              promptId: prompt.id,
              providerId: await upsertProvider(provider.key),
              responseRaw: answer,
            },
          });
          console.log(`      Created PromptRun (ID: ${promptRun.id})`);

          // 4 · persist mentions + sources
          for (const m of ext.companyMentions) {
            const companyId = await upsertCompany(m.name, m.domain);
            const sentiment = sentimentMap.get(m.domain) ?? 0;

            const companyMention = await prisma.companyMention.create({
              data: {
                promptRunId: promptRun.id,
                companyId,
                visibilityPct: 100, // binary per-run
                sentiment,
              },
            });
            console.log(
              `        - Created CompanyMention for ${m.name} (ID: ${companyMention.id})`
            );

            for (const url of m.sources) {
              const domain = new URL(url).hostname.replace(/^www\./, '');
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
          console.log(
            `      Finished persisting data for prompt: "${prompt.text}"`
          );
        }
      }
    }
  }
  console.log('\n✅ Daily visibility job finished successfully!');
}
