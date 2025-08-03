import { prisma } from '../utils/database';
import { generateText, generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const TEST_ORG_ID = '162f8322-3215-4bf3-b23f-3256c3b5e0c6';

async function testSuggestPrompts() {
  console.log('🧪 Testing /suggestPrompts endpoint simulation...');
  console.log(`📋 Using organization ID: ${TEST_ORG_ID}`);

  try {
    // Get the organization from the database
    const organization = await prisma.organization.findUnique({
      where: { id: TEST_ORG_ID },
    });

    if (!organization) {
      console.error(`❌ Organization with ID ${TEST_ORG_ID} not found`);
      process.exit(1);
    }

    console.log(`🏢 Found organization: ${organization.name}`);
    console.log(`🌐 Domain: ${organization.domain}`);
    console.log('');

    // Simulate the API call that the endpoint would make
    console.log('🤖 Making API call to Gemini Flash 2.5 with Google Search...');

    const startTime = Date.now();

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

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`✅ Company analysis completed in ${duration}ms`);
    console.log('');

    console.log('📊 COMPANY ANALYSIS RESULTS:');
    console.log('='.repeat(50));
    console.log(`Organization: ${organization.name}`);
    console.log(`Domain: ${organization.domain}`);
    console.log('');
    console.log('📝 Company Analysis:');
    console.log('-'.repeat(30));
    console.log(text);
    console.log('');

    // Step 2: Generate prompt suggestions based on the analysis
    console.log(
      '🎯 Generating prompt suggestions based on company analysis...'
    );

    const promptStartTime = Date.now();
    const promptSuggestionsSchema = z.object({
      prompts: z.array(z.string()).min(20).max(20),
    });

    const { object: promptSuggestionsObject } = await generateObject({
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
6. Return exactly 20 prompts in the prompts array. Ensure variety to cover different aspects like market share, customer pain points, innovation, and emerging trends.`,
      prompt: text, // Use the company analysis as the prompt
      temperature: 0.3,
    });

    const promptEndTime = Date.now();
    const promptDuration = promptEndTime - promptStartTime;
    const totalDuration = promptEndTime - startTime;

    console.log(`✅ Prompt suggestions generated in ${promptDuration}ms`);
    console.log('');

    // Final response format
    const finalResponse = {
      organizationDomain: organization.domain,
      organizationName: organization.name,
      analysis: text,
      prompts: promptSuggestionsObject.prompts,
      generatedAt: new Date().toISOString(),
    };

    console.log('🎯 GENERATED PROMPT SUGGESTIONS:');
    console.log('='.repeat(50));
    promptSuggestionsObject.prompts.forEach((prompt, index) => {
      console.log(`${index + 1}. ${prompt}`);
    });
    console.log('');
    console.log('✅ Test completed successfully!');
    console.log(`📈 Company analysis length: ${text.length} characters`);
    console.log(
      `📈 Generated prompts count: ${promptSuggestionsObject.prompts.length}`
    );
    console.log(`⏱️  Company analysis time: ${duration}ms`);
    console.log(`⏱️  Prompt generation time: ${promptDuration}ms`);
    console.log(`⏱️  Total execution time: ${totalDuration}ms`);
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testSuggestPrompts()
    .then(() => {
      console.log('🎉 Test script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test script failed:', error);
      process.exit(1);
    });
}

export { testSuggestPrompts };
