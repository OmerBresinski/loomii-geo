async function testRedirectUrls() {
  console.log('🔍 Testing Google Vertex AI redirect URLs...\n');

  const testRedirectUrl = "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFEaAXY7r2n8GyMICAy9JMiZHHhKcih1-wbQPTRxbedq_6-DByCLOkf1J5ivE6T4nCqysr8SuyEB10fcVoXOEBG78ze_34LRr1tQsi01t3Gn_iNqVQvJ2rByLZ4XHxHJwU_Y_nAgWAywzYY7Nb0sMfHAJWlc6_jfHnvWj_o8kQlcFMF4jVAOuCUOOkr";

  console.log(`Testing redirect URL: ${testRedirectUrl.substring(0, 80)}...`);

  try {
    // Test with HEAD request first (like the dailyVisibility job does)
    console.log('\n1. Testing HEAD request...');
    const headResponse = await fetch(testRedirectUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(1500)
    });
    
    console.log(`HEAD Status: ${headResponse.status}`);
    console.log(`Final URL: ${headResponse.url}`);
    console.log(`Headers:`, Object.fromEntries(headResponse.headers.entries()));

    // Test with GET request
    console.log('\n2. Testing GET request...');
    const getResponse = await fetch(testRedirectUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    console.log(`GET Status: ${getResponse.status}`);
    console.log(`Final URL: ${getResponse.url}`);
    
    if (getResponse.ok) {
      const content = await getResponse.text();
      console.log(`Content length: ${content.length} chars`);
      console.log(`Content preview: "${content.substring(0, 200)}..."`);
      
      // Check if content contains company names
      const companies = ['fireberry', 'powerlink', 'zoho', 'crm', 'service'];
      const found = companies.filter(company => 
        content.toLowerCase().includes(company.toLowerCase())
      );
      console.log(`Companies found: ${found.join(', ')}`);
    }

    // Test domain extraction
    console.log('\n3. Testing domain extraction...');
    const finalUrl = getResponse.url;
    try {
      const urlObj = new URL(finalUrl);
      const domain = urlObj.hostname.replace(/^www\./, '');
      console.log(`Extracted domain: ${domain}`);
    } catch (error) {
      console.log(`Domain extraction failed: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testRedirectUrls();