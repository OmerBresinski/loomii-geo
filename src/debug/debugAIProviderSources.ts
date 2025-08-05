import { prisma } from '@/utils/database';

async function debugAIProviderSources() {
  console.log('🔍 Debugging AI provider source extraction...\n');

  // Get recent prompt runs and check their responseRaw for source information
  const recentRuns = await prisma.promptRun.findMany({
    where: {
      prompt: {
        company: {
          domain: { contains: 'fireberry', mode: 'insensitive' }
        }
      }
    },
    orderBy: { runAt: 'desc' },
    take: 5,
    include: {
      prompt: {
        include: { company: true }
      }
    }
  });

  console.log(`📊 Analyzing ${recentRuns.length} recent prompt runs...\n`);

  recentRuns.forEach((run, index) => {
    console.log(`${index + 1}. Run ID: ${run.id} (${run.runAt.toISOString()})`);
    console.log(`   Prompt: "${run.prompt.text.substring(0, 60)}..."`);
    
    const response = typeof run.responseRaw === 'string' 
      ? run.responseRaw 
      : JSON.stringify(run.responseRaw);
    
    console.log(`   Response type: ${typeof run.responseRaw}`);
    console.log(`   Response length: ${response.length} chars`);
    
    // Check if response looks like it has citations or source references
    const hasUrls = /https?:\/\/[^\s]+/.test(response);
    const hasCitations = /\[[\d\]]+/.test(response) || /\([\d\]]+\)/.test(response);
    const hasSourceSection = /sources?:/i.test(response) || /references?:/i.test(response);
    
    console.log(`   Contains URLs: ${hasUrls}`);
    console.log(`   Has citations: ${hasCitations}`);
    console.log(`   Has source section: ${hasSourceSection}`);
    
    if (hasUrls) {
      const urls = response.match(/https?:\/\/[^\s)]+/g);
      console.log(`   Found ${urls?.length || 0} URLs: ${urls?.slice(0, 3).join(', ')}${urls && urls.length > 3 ? '...' : ''}`);
    }
    
    console.log('');
  });

  // Let's also check what the PROVIDERS array looks like and test a call
  console.log('🤖 Testing AI provider call...\n');
  
  try {
    // Import the provider logic
    const { google } = await import('@ai-sdk/google');
    const { generateText } = await import('ai');
    
    const testPrompt = "What are the top Israeli CRM platforms for small businesses?";
    console.log(`Testing prompt: "${testPrompt}"`);
    
    const result = await generateText({
      model: google('gemini-2.5-flash'),
      tools: {
        google_search: google.tools.googleSearch({}),
      },
      prompt: testPrompt,
      temperature: 0.3,
      maxRetries: 3,
    });
    
    console.log(`✅ AI call successful`);
    console.log(`Response length: ${result.text.length} chars`);
    console.log(`Tools used: ${result.toolCalls?.length || 0}`);
    console.log(`Sources available: ${result.sources ? 'Yes' : 'No'}`);
    
    if (result.sources) {
      console.log(`Sources count: ${Array.isArray(result.sources) ? result.sources.length : 'Not array'}`);
      if (Array.isArray(result.sources)) {
        result.sources.slice(0, 3).forEach((source, index) => {
          console.log(`  ${index + 1}. ${JSON.stringify(source)}`);
        });
      }
    }
    
    console.log('\nResponse preview:');
    console.log(`"${result.text.substring(0, 300)}..."`);
    
  } catch (error) {
    console.error('❌ AI provider test failed:', error.message);
  }
}

debugAIProviderSources().catch(console.error);