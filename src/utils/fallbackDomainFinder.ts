/**
 * Fallback domain finder using Google Gemini when Perplexity fails/is rate limited
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const DomainLookupSchema = z.object({
  domain: z
    .string()
    .nullable()
    .describe("Official company domain (e.g., 'company.com') or null if not found"),
});

export async function findDomainWithGoogle(
  companyName: string,
  genre: string
): Promise<string | null> {
  console.log(`    🔍 [Fallback] Google domain lookup for ${companyName}...`);
  
  try {
    const domainResult = await generateObject({
      schema: DomainLookupSchema,
      model: google('gemini-2.5-flash'),
      tools: {
        google_search: google.tools.googleSearch({}),
      },
      system: `You are an expert domain lookup engine. Use Google search to find the official website domain for companies.`,
      prompt: `Find the official website domain for the company "${companyName}" in the ${genre} industry. Return only the main domain (e.g., "company.com").`,
    });

    if (!domainResult.object.domain) {
      console.log(`    ❌ Google could not find domain for ${companyName}`);
      return null;
    }

    const cleanedDomain = domainResult.object.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
    console.log(`    ✅ Google suggested domain: ${cleanedDomain}`);
    return cleanedDomain;
  } catch (error) {
    console.log(`    ❌ Google domain lookup failed for ${companyName}:`, error);
    return null;
  }
}