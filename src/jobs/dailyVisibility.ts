import { z } from 'zod';
import { generateText, generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { prisma } from '@/utils/database';

const PROVIDERS = [
  {
    key: 'openai:gpt-4o',
    call: async (prompt: string) => {
      const { text } = await generateText({
        tools: {
          web_search_preview: openai.tools.webSearchPreview({
            searchContextSize: 'high',
            // userLocation: {
            //   type: 'approximate',
            //   city: 'San Francisco',
            //   region: 'California',
            // },
          }),
        },
        toolChoice: { type: 'tool', toolName: 'web_search_preview' },
        model: openai.responses('gpt-4o-mini'),
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
    system: `
    You are an extraction engine.

    INPUT:
      • PROMPT   – the user's original question to the AI
      • RESPONSE – the AI's full answer (may include citations, inline links, footnotes, or plain-text references)

    TASK:
      1. Identify **every company or product** that the RESPONSE discusses in any way
        (including the user's own company, competitors, partners, etc.).
      2. For each company return:
          • name      → canonical brand / company / product name
          • domain    → primary web domain
          • sources   → an array of DISTINCT hyperlinks the assistant consulted,
                        cited, or explicitly referenced while producing the answer.
                        – Include links that appear inline, inside footnotes,
                          or inside markdown.
      3. **Do NOT** add sentiment or visibility numbers here.
      4. Return **strictly valid JSON** in this exact shape:

        {
          "companyMentions": [
            {
              "name": "...",
              "domain": "...",
              "sources": ["https://...", "http://...", ...]
            },
            ...
          ]
        }

    RULES:
      • The JSON must parse with no extra keys, comments, or trailing commas.
      • The sources should be the URLs that were consulted while producing the answer.
      • Each distinct URL should appear only once in its "sources" array.
      • Omit the company completely if it is not actually mentioned in the RESPONSE.
    `,
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

const WebsiteNameSchema = z.object({
  websiteName: z.string(),
});
type WebsiteName = z.infer<typeof WebsiteNameSchema>;

async function extractWebsiteName(url: string): Promise<WebsiteName> {
  const { object } = await generateObject({
    schema: WebsiteNameSchema,
    model: openai.chat('gpt-4o-mini'),
    system: `
    You are a website name extraction engine.

    INPUT:
      • URL – a website URL

    TASK:
      Extract the human-readable website name from the given URL.
      Return the proper name/brand of the website, not just the domain.
      
      Examples:
      - "https://techcrunch.com/article" → "TechCrunch"
      - "https://www.nytimes.com/section" → "The New York Times"
      - "https://github.com/user/repo" → "GitHub"
      - "https://stackoverflow.com/questions" → "Stack Overflow"

    RULES:
      • Return the proper brand/website name, not the domain
      • Use proper capitalization and spacing
      • Return JSON in this exact format: {"websiteName": "..."}
    `,
    prompt: `URL: ${url}`,
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
              const websiteNameResult = await extractWebsiteName(url);

              const domain = new URL(url).hostname.replace(/^www\./, '');
              const sourceId = (
                await prisma.source.upsert({
                  where: { domain },
                  create: { domain, name: websiteNameResult.websiteName },
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
