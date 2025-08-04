import { z } from 'zod';
import { generateText, generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { perplexity } from '@ai-sdk/perplexity';
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
    key: 'Gemini',
    call: async (prompt: string) => {
      const { text, sources } = await generateText({
        model: google('gemini-2.5-flash'),
        tools: {
          google_search: google.tools.googleSearch({}),
        },
        prompt,
        temperature: 0.3,
        maxRetries: 3,
      });

      const fullSources = [];

      // Sources might not be available in AI SDK v5
      if (sources && Array.isArray(sources)) {
        for (const source of sources) {
          try {
            // Check if source has url property
            const sourceUrl = (source as any).url;
            if (sourceUrl) {
              const response = await fetch(sourceUrl, {
                method: 'HEAD',
                signal: AbortSignal.timeout(1500), // 5 second timeout
              });
              const url = response.url;
              fullSources.push({ url });
            }
          } catch (e) {
            console.log('Link fetch error', (source as any).url);
            continue;
          }
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

// Step 1: Extract company genre/category from the discussion
async function extractCompanyGenre(
  prompt: string,
  answer: string
): Promise<string> {
  const GenreExtractionSchema = z.object({
    genre: z
      .string()
      .describe(
        "Category/type of companies discussed (e.g., 'CRM software companies', 'design agencies in Israel')"
      ),
  });

  const result = await generateObject({
    schema: GenreExtractionSchema,
    model: google('gemini-2.5-flash'),
    system: `Based on the prompt and response, identify what category/genre of companies is being discussed.

Examples of good genres:
- "CRM software companies"  
- "design agencies in Israel"
- "crypto companies in the UK"
- "AI startups in San Francisco"
- "e-commerce platforms"
- "healthcare technology companies"

Be specific about industry and location if mentioned. This will be used to help identify official company domains.`,
    prompt: `PROMPT: ${prompt}

RESPONSE: ${answer}

What category/genre of companies is being discussed?`,
  });

  console.log(`🎯 Extracted genre: ${result.object.genre}`);
  return result.object.genre;
}

// Step 2: Extract company names only (no domains) with filtering and Hebrew translation
async function extractCompanyNamesOnly(
  prompt: string,
  answer: string
): Promise<string[]> {
  const CompanyNamesSchema = z.object({
    companies: z.array(
      z.object({
        name: z
          .string()
          .describe(
            'Company name in English (translated if originally in Hebrew)'
          ),
      })
    ),
  });

  const companyResult = await generateObject({
    schema: CompanyNamesSchema,
    model: google('gemini-2.5-flash'),
    temperature: 0.1, // Lower temperature for more consistent results
    system: `You are an expert company name extraction specialist. Your job is to find company names that are RANKED, RECOMMENDED, or are the MAIN SUBJECT of the AI response text.

YOUR MISSION: Extract ONLY companies that are RANKED, RECOMMENDED, or are the MAIN SUBJECT of the response - not just mentioned in passing!

WHAT TO EXTRACT:
- Companies that are ranked or listed (e.g., "Top CRM tools: 1. HubSpot, 2. Salesforce")
- Companies that are recommended or suggested as solutions
- Companies that are the main subject or focus of the response
- Companies in comparative lists (e.g., "We compared Asana, Trello, and Notion")
- Companies presented as alternatives or options to consider
- Companies mentioned as market leaders or top choices
- Companies in "best of" or "top" lists
- Companies that are being evaluated or reviewed
- Companies that are direct competitors being compared
- Universities and educational institutions ONLY when they are ranked or recommended

WHAT NOT TO EXTRACT:
- Companies mentioned only as passing examples (e.g., "Like what Slack did...")
- Companies mentioned in historical context without current relevance
- Companies mentioned as brief references or analogies

WHAT NOT TO EXTRACT:
- Generic terms: "other companies", "various vendors", "many solutions"
- These big tech giants: Google, Apple, Facebook, Meta, Microsoft, Amazon, YouTube, Instagram, WhatsApp, Alphabet
- Domains/URLs without company context
- Product categories (e.g., "CRM software" - only extract if it's a company name)

LANGUAGE HANDLING:
- If company name is in Hebrew, translate to English
- If it's a transliteration/proper name, use the English version
- Examples: "פרימיס" → "Primis", "אלפא" → "Alpha"

EXTRACTION EXAMPLES:

Input: "The best CRM solutions include HubSpot, Salesforce, and Pipedrive"
Extract: ["HubSpot", "Salesforce", "Pipedrive"] (all are ranked/recommended)

Input: "Unlike Slack or Microsoft Teams, this tool focuses on..."
Extract: [] (neither is ranked/recommended, just mentioned as examples)

Input: "Top project management tools: 1. Notion, 2. Asana, 3. Monday.com"
Extract: ["Notion", "Asana", "Monday"] (all are ranked)

Input: "We compared it to what Zoom does for video calls"
Extract: [] (Zoom is just a passing example, not being recommended)

Input: "The startup reminded me of early Airbnb"
Extract: [] (Airbnb is just a historical example, not current recommendation)

Input: "Best universities for AI research: MIT, Stanford, and Technion"
Extract: ["MIT", "Stanford", "Technion"] (all are ranked/recommended)

Input: "We recommend considering these alternatives: Slack, Discord, or HubSpot"
Extract: ["Slack", "Discord", "HubSpot"] (all are recommended alternatives)

Input: "Like what Netflix did for streaming, this platform aims to revolutionize..."
Extract: [] (Netflix is just an analogy, not a current recommendation)

THOROUGHNESS CHECK:
Before finishing, scan the text again for:
- Company names at the beginning of sentences
- Company names at the end of sentences
- Company names in the middle of lists
- Company names mentioned only once
- Company names with ".com", ".io", etc. (extract the company part)
- Abbreviated company names or acronyms that represent companies

CRITICAL: Do not miss ANY company names. Be extremely thorough.`,
    prompt: `ORIGINAL PROMPT: ${prompt}

AI RESPONSE TO ANALYZE:
"""
${answer}
"""

Now extract ALL company names mentioned in the AI response above. Scan thoroughly and don't miss any company names.`,
  });

  console.log(
    `📝 Extracted ${companyResult.object.companies.length} company names: ${companyResult.object.companies.map(c => c.name).join(', ')}`
  );
  return companyResult.object.companies
    .map(c => c.name)
    .filter(name => name.trim() !== '');
}

// Helper function to verify if a domain exists
async function verifyDomainExists(domain: string): Promise<boolean> {
  try {
    const response = await fetch(`https://${domain}`, {
      method: 'HEAD',
    });
    return response.ok || response.status === 301 || response.status === 302;
  } catch (error) {
    return false;
  }
}

// Strategy 1: Extract domains from existing sources
async function findDomainFromSources(
  companyName: string,
  sources: { url: string }[]
): Promise<string | null> {
  console.log(`    🔍 [1/3] Checking sources for ${companyName}...`);

  for (const source of sources) {
    try {
      const url = new URL(source.url);
      const hostname = url.hostname.replace(/^www\./, '');

      // Extract just the main domain name (e.g., "hubspot" from "hubspot.com")
      const domainParts = hostname.split('.');
      if (domainParts.length < 2) continue; // Skip invalid domains

      // Get the main domain name (excluding TLD and subdomains)
      // For "app.hubspot.com" this would be "hubspot"
      // For "techcrunch.com" this would be "techcrunch"
      const mainDomainName = domainParts[domainParts.length - 2];

      // Clean company name for comparison
      const cleanCompanyName = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const cleanMainDomain = mainDomainName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      // Only match if the main domain name matches the company name
      if (cleanMainDomain === cleanCompanyName && cleanCompanyName.length > 2) {
        console.log(`    ✅ Found potential domain from sources: ${hostname}`);

        // Verify domain exists
        if (await verifyDomainExists(hostname)) {
          console.log(`    ✅ Domain verified: ${hostname}`);
          return hostname;
        } else {
          console.log(`    ❌ Domain verification failed: ${hostname}`);
        }
      }
    } catch (error) {
      continue;
    }
  }

  console.log(`    ❌ No domain found in sources for ${companyName}`);
  return null;
}

// Strategy 2: AI-powered domain lookup with verification
async function findDomainWithAI(
  companyName: string,
  genre: string
): Promise<string | null> {
  console.log(`    🤖 [2/3] AI domain lookup for ${companyName}...`);

  const DomainLookupSchema = z.object({
    domain: z
      .string()
      .nullable()
      .describe(
        "Official company domain (e.g., 'company.com') or null if not found"
      ),
  });

  try {
    const domainResult = await generateObject({
      schema: DomainLookupSchema,
      model: perplexity('sonar'),
      system: `You are an expert domain lookup engine for companies, universities, and organizations`,
      prompt: `what's the domain of ${companyName}`,
    });

    if (!domainResult.object.domain) {
      console.log(`    ❌ AI could not find domain for ${companyName}`);
      return null;
    }

    const cleanedDomain = cleanDomain(domainResult.object.domain);
    console.log(`    ✅  AI suggested domain: ${cleanedDomain}`);
    return cleanedDomain;
  } catch (error) {
    console.log(`    ❌ AI domain lookup failed for ${companyName}:`, error);
    return null;
  }
}

// Strategy 3: Search inside source page content for domains
async function findDomainFromSourceContent(
  companyName: string,
  sources: { url: string }[]
): Promise<string | null> {
  console.log(
    `    📄 [3/3] Searching source page content for ${companyName}...`
  );

  for (const source of sources) {
    try {
      console.log(`      🔍 Fetching content from: ${source.url}`);
      const response = await fetch(source.url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        console.log(
          `      ❌ Failed to fetch ${source.url}: ${response.status}`
        );
        continue;
      }

      const content = await response.text();

      // Extract potential domains from the content
      // Look for patterns like company.com, company.io, etc.
      const cleanCompanyName = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      // Common domain patterns
      const domainPatterns = [
        new RegExp(
          `\\b${cleanCompanyName}\\.(com|io|net|org|co|ai|tech|app|dev)\\b`,
          'gi'
        ),
        new RegExp(
          `\\bhttps?:\\/\\/(www\\.)?${cleanCompanyName}\\.(com|io|net|org|co|ai|tech|app|dev)`,
          'gi'
        ),
        new RegExp(`\\b${cleanCompanyName}\\.(co\\.[a-z]{2})\\b`, 'gi'), // co.uk, co.il, etc.
      ];

      const foundDomains = new Set<string>();

      for (const pattern of domainPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            // Clean the matched domain
            let domain = match
              .replace(/^https?:\/\/(www\.)?/, '') // Remove protocol and www
              .replace(/[^\w.-]/g, '') // Remove any non-domain characters
              .toLowerCase();

            if (domain && domain.includes('.') && domain.length > 4) {
              foundDomains.add(domain);
            }
          });
        }
      }

      if (foundDomains.size > 0) {
        console.log(
          `      🎯 Found potential domains: ${Array.from(foundDomains).join(', ')}`
        );

        // Verify each found domain
        for (const domain of foundDomains) {
          console.log(`      🔍 Verifying domain: ${domain}`);
          if (await verifyDomainExists(domain)) {
            console.log(
              `      ✅ Domain verified from source content: ${domain}`
            );
            return domain;
          } else {
            console.log(`      ❌ Domain verification failed: ${domain}`);
          }
        }
      }
    } catch (error) {
      console.log(
        `      ❌ Error fetching source content from ${source.url}:`,
        error
      );
      continue;
    }
  }

  console.log(
    `    ❌ No verified domain found in source content for ${companyName}`
  );
  return null;
}

// Main domain finder function
async function findOfficialDomain(
  companyName: string,
  genre: string,
  sources: { url: string }[] = []
): Promise<string | null> {
  console.log(`  🔍 Finding domain for: ${companyName}`);

  // Strategy 1: AI-powered lookup with verification
  const aiDomain = await findDomainWithAI(companyName, genre);
  if (aiDomain) {
    return aiDomain;
  }

  // // Strategy 2: Check existing sources first
  // const sourceDomain = await findDomainFromSources(companyName, sources);
  // if (sourceDomain) {
  //   return sourceDomain;
  // }

  // // Strategy 3: Search inside source page content
  // const contentDomain = await findDomainFromSourceContent(companyName, sources);
  // if (contentDomain) {
  //   return contentDomain;
  // }

  // Fallback: Use company name + .com (no verification needed)
  console.log(
    `    🎯 [Fallback] Using company name + .com for: ${companyName}`
  );

  const cleanCompanyName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Safety check: if cleaning results in empty string, use "company" as fallback
  const safeName = cleanCompanyName || 'company';
  const fallbackDomain = `${safeName}.com`;
  console.log(`    📝 Fallback domain: ${fallbackDomain}`);

  return fallbackDomain;
}

async function extractMentions(
  prompt: string,
  answer: string,
  sources: { url: string }[] = []
): Promise<Extraction> {
  console.log('🎯 [1/3] Extracting company genre...');
  const genre = await extractCompanyGenre(prompt, answer);

  console.log('📝 [2/3] Extracting company names (with Hebrew translation)...');
  const companyNames = await extractCompanyNamesOnly(prompt, answer);

  if (companyNames.length === 0) {
    console.log('    No companies found, returning empty result');
    return { companyMentions: [] };
  }

  // Filter out empty company names
  const validCompanyNames = companyNames.filter(
    name => name && name.trim() !== ''
  );

  if (validCompanyNames.length !== companyNames.length) {
    console.log(
      `  ⚠️  Filtered out ${companyNames.length - validCompanyNames.length} empty company names`
    );
  }

  console.log('🔍 [3/3] Finding and verifying domains...');

  // Find domains for each company sequentially (with verification)
  const companyMentions: { name: string; domain: string }[] = [];

  for (const companyName of validCompanyNames) {
    const domain = await findOfficialDomain(companyName, genre, sources);
    if (domain) {
      companyMentions.push({
        name: companyName,
        domain: domain,
      });
    }
  }

  console.log(
    `✅ Successfully found and verified ${companyMentions.length}/${validCompanyNames.length} company domains`
  );

  return { companyMentions };
}

async function scoreSentiments(
  answer: string,
  companies: { name: string; domain: string }[]
): Promise<Sentiment> {
  const sentimentResult = await generateObject({
    schema: SentimentSchema,
    model: google('gemini-2.5-flash'),
    system:
      `Rate the overall sentiment toward each company on a −1 (very negative) to +1 (very positive) scale.\n` +
      `Return JSON {sentiments:[{name,domain,sentiment}]}.`,
    prompt:
      `ANSWER:\n${answer}\n\nCOMPANIES:\n` +
      companies.map(c => `${c.name} | ${c.domain}`).join('\n'),
  });

  return sentimentResult.object;
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
  const websiteResult = await generateObject({
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
  return websiteResult.object;
}

const upsertProvider = async (name: string) =>
  (
    await prisma.aIProvider.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  ).id;

const upsertCompany = async (name: string, domain: string) => {
  // Check if company already exists
  const existing = await prisma.company.findUnique({
    where: { domain },
  });

  if (existing) {
    // Update with the longer/more complete name if the new one is more descriptive
    const shouldUpdateName =
      name.length > existing.name.length ||
      (name.toLowerCase().includes('university') &&
        !existing.name.toLowerCase().includes('university'));

    if (shouldUpdateName) {
      console.log(
        `    📝 Updating company name: "${existing.name}" → "${name}"`
      );
      await prisma.company.update({
        where: { domain },
        data: { name },
      });
    }
    return existing.id;
  } else {
    // Create new company
    const created = await prisma.company.create({
      data: { name, domain },
    });
    return created.id;
  }
};

/**
 * Run daily visibility job for a specific organization
 */
export async function runDailyVisibilityJobForOrganization(
  organizationId: string
) {
  console.log(
    `🚀 Starting daily visibility job for organization: ${organizationId}`
  );

  const companies = await prisma.company.findMany({
    where: {
      organizationId: organizationId,
    },
    include: {
      prompts: {
        where: { isActive: true },
        include: {
          promptTags: {
            include: { tag: true },
          },
        },
      },
    },
  });
  console.log(`Found ${companies.length} companies to process.`);

  if (companies.length === 0) {
    console.log('⚠️  No companies found for this organization');
    return;
  }

  for (const company of companies) {
    console.log(`\n🏢 Processing company: ${company.name}`);

    // Parallelize prompt processing
    const promptResults = await Promise.allSettled(
      company.prompts.map(async prompt => {
        const tagLabels = prompt.promptTags.map(pt => pt.tag.label).join(', ');
        console.log(`  🏷️  Processing prompt (${tagLabels}): "${prompt.text}"`);

        // Parallelize provider processing
        const providerResults = await Promise.allSettled(
          PROVIDERS.map(async provider => {
            console.log(`    🤖 Using provider: ${provider.key}`);
            // 0 · get the model's answer
            console.log('        [1/4] Getting response from AI provider...');
            const { text: answer, sources } = await provider.call(prompt.text);

            console.log({ sources });

            // 1 · extract companies + URLs
            console.log('        [2/4] Extracting company mentions...');
            const ext = await extractMentions(prompt.text, answer, sources);
            console.log(
              `        Found ${ext.companyMentions.length} company mentions and ${sources.length} sources.`
            );

            // 2 · score sentiment per company
            console.log('        [3/4] Scoring sentiments...');

            // Remove duplicates based on name and domain combination
            const uniqueCompanyMentions = ext.companyMentions.filter(
              (mention, index, arr) =>
                arr.findIndex(
                  m => m.name === mention.name && m.domain === mention.domain
                ) === index
            );

            const sent = await scoreSentiments(
              answer,
              uniqueCompanyMentions.map(({ name, domain }) => ({
                name,
                domain,
              }))
            );
            const sentimentMap = new Map(
              sent.sentiments.map(s => [s.domain || s.name, s.sentiment])
            );
            console.log(`        Scored ${sent.sentiments.length} sentiments.`);

            // 3 · persist PromptRun
            console.log('        [4/4] Persisting data to database...');
            const promptRun = await prisma.promptRun.create({
              data: {
                promptId: prompt.id,
                providerId: await upsertProvider(provider.key),
                responseRaw: answer,
              },
            });
            console.log(`        Created PromptRun (ID: ${promptRun.id})`);

            // Helper function to normalize domain (remove protocol, www, etc.)
            const normalizeDomain = (domain: string): string => {
              if (!domain) return '';
              return domain
                .toLowerCase()
                .replace(/^https?:\/\//, '') // Remove protocol
                .replace(/^www\./, '') // Remove www
                .replace(/\/$/, ''); // Remove trailing slash
            };

            // 3.5 · save mention with all mentioned companies if current company is mentioned
            const currentCompanyMentioned = uniqueCompanyMentions.find(m => {
              if (!m.domain || !company.domain) {
                // If no domain info, only match by exact name (be very cautious)
                return m.name.toLowerCase() === company.name.toLowerCase();
              }

              // Normalize both domains for comparison
              const normalizedMentionDomain = normalizeDomain(m.domain);
              const normalizedCompanyDomain = normalizeDomain(company.domain);

              // First try exact normalized domain match
              if (normalizedMentionDomain === normalizedCompanyDomain) {
                return true;
              }

              // If domains don't match, only allow name matching if they share the same base domain
              if (m.name.toLowerCase() === company.name.toLowerCase()) {
                // Extract base domain (e.g., "company.com" from "subdomain.company.com")
                const getMentionBaseDomain = (domain: string): string => {
                  const parts = domain.split('.');
                  return parts.length >= 2 ? parts.slice(-2).join('.') : domain;
                };

                const mentionBaseDomain = getMentionBaseDomain(
                  normalizedMentionDomain
                );
                const companyBaseDomain = getMentionBaseDomain(
                  normalizedCompanyDomain
                );

                return mentionBaseDomain === companyBaseDomain;
              }

              return false;
            });

            if (currentCompanyMentioned) {
              console.log(
                `        🎯 AI response mentions current company: ${company.name} (${company.domain})`
              );
              console.log(
                `        🔍 Matched mention: ${currentCompanyMentioned.name} (${currentCompanyMentioned.domain})`
              );
              console.log(
                `        📋 Found ${uniqueCompanyMentions.length} total company mentions`
              );

              // Prepare all mentioned companies data for JSON storage
              const mentionedCompaniesData = uniqueCompanyMentions.map(
                mention => ({
                  name: mention.name,
                  domain: mention.domain,
                })
              );

              await prisma.mention.create({
                data: {
                  promptId: prompt.id,
                  content: answer,
                  aiProviderId: await upsertProvider(provider.key),
                  companyId: company.id,
                  mentionedCompanies: mentionedCompaniesData,
                },
              });
              console.log(
                `        ✅ Saved mention for company: ${company.name} with ${mentionedCompaniesData.length} mentioned companies`
              );
            }

            // 4 · persist mentions + sources
            console.log(`        Processing ${sources.length} sources...`);

            // Parallelize source processing
            const sourceResults = await Promise.allSettled(
              sources.map(async source => {
                const url = source.url;
                if (!url) return null;

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

                return { url, sourceUrlId };
              })
            );

            const sourceUrlIds: number[] = [];
            sourceResults.forEach(result => {
              if (result.status === 'fulfilled' && result.value) {
                sourceUrlIds.push(result.value.sourceUrlId);
              } else if (result.status === 'rejected') {
                console.error('Source processing failed:', result.reason);
              }
            });

            // Parallelize source page fetching
            const sourcePageResults = await Promise.allSettled(
              sources.map(async source => {
                const sourcePage = await fetch(source.url);
                const sourcePageText = await sourcePage.text();

                if (
                  sourcePageText
                    .toLowerCase()
                    .includes(company.name.toLowerCase())
                ) {
                  return source.url;
                }
                return null;
              })
            );

            const sourcesOfCompany: string[] = [];
            sourcePageResults.forEach(result => {
              if (result.status === 'fulfilled' && result.value) {
                sourcesOfCompany.push(result.value);
              } else if (result.status === 'rejected') {
                console.error('Source page fetch failed:', result.reason);
              }
            });

            // Parallelize company mention processing
            await Promise.allSettled(
              uniqueCompanyMentions.map(async m => {
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
                await Promise.allSettled(
                  sourcesOfCompany.map(async source => {
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
                  })
                );
              })
            );
            console.log(
              `        Finished persisting data for prompt: "${prompt.text}" with provider: ${provider.key}`
            );

            return { provider: provider.key, success: true };
          })
        );

        // Log provider results for this prompt
        providerResults.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(
              `Provider ${PROVIDERS[index].key} failed for prompt "${prompt.text}":`,
              result.reason
            );
          } else {
            console.log(
              `Provider ${result.value.provider} completed successfully for prompt "${prompt.text}"`
            );
          }
        });

        return { promptId: prompt.id, promptText: prompt.text, success: true };
      })
    );

    // Log prompt results for this company
    promptResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `Prompt "${company.prompts[index].text}" failed for company ${company.name}:`,
          result.reason
        );
      } else {
        console.log(
          `Prompt "${result.value.promptText}" completed successfully for company ${company.name}`
        );
      }
    });
  }

  console.log(
    '\n✅ Daily visibility job for organization finished successfully!'
  );
}

/**
 *  Main cron – run daily (e.g. Vercel Cron 07:00 UTC)                   *
 * --------------------------------------------------------------------- */
export async function runDailyVisibilityJob() {
  console.log('🚀 Starting daily visibility job...');
  const companies = await prisma.company.findMany({
    include: {
      prompts: {
        where: { isActive: true },
        include: {
          promptTags: {
            include: { tag: true },
          },
        },
      },
    },
  });
  console.log(`Found ${companies.length} companies to process.`);

  for (const company of companies) {
    console.log(`\n🏢 Processing company: ${company.name}`);

    // Parallelize prompt processing
    const promptResults = await Promise.allSettled(
      company.prompts.map(async prompt => {
        const tagLabels = prompt.promptTags.map(pt => pt.tag.label).join(', ');
        console.log(`  🏷️  Processing prompt (${tagLabels}): "${prompt.text}"`);

        // Parallelize provider processing
        const providerResults = await Promise.allSettled(
          PROVIDERS.map(async provider => {
            console.log(`    🤖 Using provider: ${provider.key}`);
            // 0 · get the model's answer
            console.log('        [1/4] Getting response from AI provider...');
            const { text: answer, sources } = await provider.call(prompt.text);

            console.log({ sources });

            // 1 · extract companies + URLs
            console.log('        [2/4] Extracting company mentions...');
            const ext = await extractMentions(prompt.text, answer, sources);
            console.log(
              `        Found ${ext.companyMentions.length} company mentions and ${sources.length} sources.`
            );

            // 2 · score sentiment per company
            console.log('        [3/4] Scoring sentiments...');

            // Remove duplicates based on name and domain combination
            const uniqueCompanyMentions = ext.companyMentions.filter(
              (mention, index, arr) =>
                arr.findIndex(
                  m => m.name === mention.name && m.domain === mention.domain
                ) === index
            );

            const sent = await scoreSentiments(
              answer,
              uniqueCompanyMentions.map(({ name, domain }) => ({
                name,
                domain,
              }))
            );
            const sentimentMap = new Map(
              sent.sentiments.map(s => [s.domain || s.name, s.sentiment])
            );
            console.log(`        Scored ${sent.sentiments.length} sentiments.`);

            // 3 · persist PromptRun
            console.log('        [4/4] Persisting data to database...');
            const promptRun = await prisma.promptRun.create({
              data: {
                promptId: prompt.id,
                providerId: await upsertProvider(provider.key),
                responseRaw: answer,
              },
            });
            console.log(`        Created PromptRun (ID: ${promptRun.id})`);

            // Helper function to normalize domain (remove protocol, www, etc.)
            const normalizeDomain = (domain: string): string => {
              if (!domain) return '';
              return domain
                .toLowerCase()
                .replace(/^https?:\/\//, '') // Remove protocol
                .replace(/^www\./, '') // Remove www
                .replace(/\/$/, ''); // Remove trailing slash
            };

            // 3.5 · save mention with all mentioned companies if current company is mentioned
            const currentCompanyMentioned = uniqueCompanyMentions.find(m => {
              if (!m.domain || !company.domain) {
                // If no domain info, only match by exact name (be very cautious)
                return m.name.toLowerCase() === company.name.toLowerCase();
              }

              // Normalize both domains for comparison
              const normalizedMentionDomain = normalizeDomain(m.domain);
              const normalizedCompanyDomain = normalizeDomain(company.domain);

              // First try exact normalized domain match
              if (normalizedMentionDomain === normalizedCompanyDomain) {
                return true;
              }

              // If domains don't match, only allow name matching if they share the same base domain
              if (m.name.toLowerCase() === company.name.toLowerCase()) {
                // Extract base domain (e.g., "company.com" from "subdomain.company.com")
                const getMentionBaseDomain = (domain: string): string => {
                  const parts = domain.split('.');
                  return parts.length >= 2 ? parts.slice(-2).join('.') : domain;
                };

                const mentionBaseDomain = getMentionBaseDomain(
                  normalizedMentionDomain
                );
                const companyBaseDomain = getMentionBaseDomain(
                  normalizedCompanyDomain
                );

                return mentionBaseDomain === companyBaseDomain;
              }

              return false;
            });

            if (currentCompanyMentioned) {
              console.log(
                `        🎯 AI response mentions current company: ${company.name} (${company.domain})`
              );
              console.log(
                `        🔍 Matched mention: ${currentCompanyMentioned.name} (${currentCompanyMentioned.domain})`
              );
              console.log(
                `        📋 Found ${uniqueCompanyMentions.length} total company mentions`
              );

              // Prepare all mentioned companies data for JSON storage
              const mentionedCompaniesData = uniqueCompanyMentions.map(
                mention => ({
                  name: mention.name,
                  domain: mention.domain,
                })
              );

              await prisma.mention.create({
                data: {
                  promptId: prompt.id,
                  content: answer,
                  aiProviderId: await upsertProvider(provider.key),
                  companyId: company.id,
                  mentionedCompanies: mentionedCompaniesData,
                },
              });
              console.log(
                `        ✅ Saved mention for company: ${company.name} with ${mentionedCompaniesData.length} mentioned companies`
              );
            }

            // 4 · persist mentions + sources
            console.log(`        Processing ${sources.length} sources...`);

            // Parallelize source processing
            const sourceResults = await Promise.allSettled(
              sources.map(async source => {
                const url = source.url;
                if (!url) return null;

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

                return { url, sourceUrlId };
              })
            );

            const sourceUrlIds: number[] = [];
            sourceResults.forEach(result => {
              if (result.status === 'fulfilled' && result.value) {
                sourceUrlIds.push(result.value.sourceUrlId);
              } else if (result.status === 'rejected') {
                console.error('Source processing failed:', result.reason);
              }
            });

            // Parallelize source page fetching
            const sourcePageResults = await Promise.allSettled(
              sources.map(async source => {
                const sourcePage = await fetch(source.url);
                const sourcePageText = await sourcePage.text();

                console.log({ sourcePageText });

                if (
                  sourcePageText
                    .toLowerCase()
                    .includes(company.name.toLowerCase())
                ) {
                  return source.url;
                }
                return null;
              })
            );

            const sourcesOfCompany: string[] = [];
            sourcePageResults.forEach(result => {
              if (result.status === 'fulfilled' && result.value) {
                sourcesOfCompany.push(result.value);
              } else if (result.status === 'rejected') {
                console.error('Source page fetch failed:', result.reason);
              }
            });

            // Parallelize company mention processing
            await Promise.allSettled(
              uniqueCompanyMentions.map(async m => {
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
                await Promise.allSettled(
                  sourcesOfCompany.map(async source => {
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
                  })
                );
              })
            );
            console.log(
              `        Finished persisting data for prompt: "${prompt.text}" with provider: ${provider.key}`
            );

            return { provider: provider.key, success: true };
          })
        );

        // Log provider results for this prompt
        providerResults.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(
              `Provider ${PROVIDERS[index].key} failed for prompt "${prompt.text}":`,
              result.reason
            );
          } else {
            console.log(
              `Provider ${result.value.provider} completed successfully for prompt "${prompt.text}"`
            );
          }
        });

        return { promptId: prompt.id, promptText: prompt.text, success: true };
      })
    );

    // Log prompt results for this company
    promptResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `Prompt "${company.prompts[index].text}" failed for company ${company.name}:`,
          result.reason
        );
      } else {
        console.log(
          `Prompt "${result.value.promptText}" completed successfully for company ${company.name}`
        );
      }
    });
  }
  console.log('\n✅ Daily visibility job finished successfully!');
}
