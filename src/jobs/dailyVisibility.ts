import { object, z } from 'zod';
import { generateText, generateObject } from 'ai';
// import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { prisma } from '@/utils/database';

const genericSchema = z.object({
  text: z.string(),
  sources: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
    })
  ),
});

const PROVIDERS = [
  {
    key: 'openai:gpt-4o',
    call: async (prompt: string) => {
      const { text, sources, providerMetadata } = await generateText({
        model: google('gemini-2.5-pro', {
          useSearchGrounding: true,
        }),
        prompt,
        temperature: 0.3,
        maxTokens: 2048,
      });

      console.log({ metaData: JSON.stringify(providerMetadata, null, 2) });

      const fullSources = [];

      for (const source of sources) {
        try {
          const response = await fetch(source.url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(1500), // 5 second timeout
          });
          const url = response.url;
          fullSources.push({ url });
        } catch (e) {
          console.log('Link fetch error', source.url);
          continue;
        }
      }

      return {
        text,
        sources: fullSources,
      };
    },
  },
] as const;

const ExtractionSchema = z.object({
  companyMentions: z.array(
    z.object({
      name: z.string(),
      domain: z.string(),
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
    model: google('gemini-2.5-flash'),
    system: `
    You are a company name & domain extraction engine.

    INPUT:
      • PROMPT   – the user's original question to the AI
      • RESPONSE – the AI's full answer (may include citations, inline links, footnotes, or plain-text references)

    TASK:
      0. (optional) Translate the RESPONSE to English if it's not already in English.
      1. Identify **every company or product** that the RESPONSE discusses in any way
        (including the user's own company, competitors, partners, etc.) - BESIDES if it doesnt make sense, for example: If the user asks about the best Salesforce partner, then ignore Salesforce.
      2. For each company return:
          • name      → canonical brand / company / product name
          • domain    → primary web domain of the company (without http://, https://, or trailing slashes)
      3. **Do NOT** add sentiment or visibility numbers here.
      4. Return **strictly valid JSON** in this exact shape:

        {
          "companyMentions": [
            {
              "name": "...",
              "domain": "..."
            },
            ...
          ]
        }

    RULES:
      • The JSON must parse with no extra keys, comments, or trailing commas.
      • Company domains should be the primary website of the company, clean format (e.g., "example.com" not "https://example.com/").
      • Company domains should be the primary website of the company, not every source that talks about the company is the company's domain - only include the primary domain.
      • Omit the company completely if it is not actually mentioned in the RESPONSE.
    `,
    prompt: `PROMPT:\n${prompt}\n\nRESPONSE:\n${answer}`,
  });

  // Clean up domains in the extracted mentions
  const cleanedMentions = {
    companyMentions: object.companyMentions.map(mention => ({
      ...mention,
      domain: cleanDomain(mention.domain),
    })),
  };

  return cleanedMentions;
}

async function scoreSentiments(
  answer: string,
  companies: { name: string; domain: string }[]
): Promise<Sentiment> {
  const { object } = await generateObject({
    schema: SentimentSchema,
    model: google('gemini-2.5-flash'),
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

// Helper function to clean up domain names
function cleanDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//, '') // Remove http:// or https://
    .replace(/\/$/, ''); // Remove trailing slash
}

async function extractWebsiteName(url: string): Promise<WebsiteName> {
  const { object } = await generateObject({
    schema: WebsiteNameSchema,
    model: google('gemini-2.5-flash'),
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

  for (const company of companies) {
    console.log(`\n🏢 Processing company: ${company.name}`);
    for (const topic of company.topics) {
      console.log(`  📚 Processing topic: ${topic.name}`);
      for (const prompt of topic.prompts) {
        console.log(`    💬 Processing prompt: "${prompt.text}"`);
        for (const provider of PROVIDERS) {
          console.log(`      🤖 Using provider: ${provider.key}`);
          // 0 · get the model's answer
          console.log('      [1/4] Getting response from AI provider...');
          const { text: answer, sources } = await provider.call(prompt.text);

          console.log({ sources });

          // 1 · extract companies + URLs
          console.log('      [2/4] Extracting company mentions...');
          const ext = await extractMentions(prompt.text, answer);
          console.log(
            `      Found ${ext.companyMentions.length} company mentions and ${sources.length} sources.`
          );

          // 2 · score sentiment per company
          console.log('      [3/4] Scoring sentiments...');

          // Remove duplicates based on name and domain combination
          const uniqueCompanyMentions = ext.companyMentions.filter(
            (mention, index, arr) =>
              arr.findIndex(
                m => m.name === mention.name && m.domain === mention.domain
              ) === index
          );

          const sent = await scoreSentiments(
            answer,
            uniqueCompanyMentions.map(({ name, domain }) => ({ name, domain }))
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
          console.log(`      Processing ${sources.length} sources...`);

          // First, process all sources and create SourceUrl records
          const sourceUrlIds: number[] = [];
          for (const source of sources) {
            const url = source.url;
            if (!url) continue;

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

            sourceUrlIds.push(sourceUrlId);
          }

          const sourcesOfCompany = [];
          for (const source of sources) {
            const sourcePage = await fetch(source.url);
            const sourcePageText = await sourcePage.text();

            console.log({ sourcePageText });

            if (
              sourcePageText.toLowerCase().includes(company.name.toLowerCase())
            ) {
              sourcesOfCompany.push(source.url);
            }
          }

          // Then, process each company mention and associate with all sources
          for (const m of uniqueCompanyMentions) {
            const companyId = await upsertCompany(m.name, m.domain);
            const sentiment = sentimentMap.get(m.domain) ?? 0;

            console.log('Creating mention for', m.name, m.domain);

            const companyMention = await prisma.companyMention.upsert({
              where: {
                promptRunId_companyId: {
                  promptRunId: promptRun.id,
                  companyId,
                },
              },
              update: {
                sentiment, // Update sentiment if it already exists
              },
              create: {
                promptRunId: promptRun.id,
                companyId,
                sentiment,
              },
            });
            console.log(
              `        - Created CompanyMention for ${m.name} (ID: ${companyMention.id})`
            );

            // Associate this company mention with all sources from this prompt run

            for (const source of sourcesOfCompany) {
              const sourceUrl = await prisma.sourceUrl.findUnique({
                where: { url: source },
              });
              if (sourceUrl) {
                await prisma.mentionDetail.create({
                  data: {
                    promptRunId: promptRun.id,
                    companyId,
                    sourceUrlId: sourceUrl.id,
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
}
