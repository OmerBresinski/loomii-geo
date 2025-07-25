export {};

const API_BASE_URL = 'http://localhost:3000/api'; // Adjust if your server runs on a different port
const BINANCE_COMPANY_ID = 1; // Assuming Binance is companyId 1

async function testAnalyticsEndpoint() {
  console.log('--- Testing GET /analytics endpoint ---');

  const url = `${API_BASE_URL}/analytics/${BINANCE_COMPANY_ID}?days=30`;

  try {
    console.log(`Fetching from: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log('✅ Test Passed!');
    console.log('Received data:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Test Failed!');
    console.error(error);
  }
}

testAnalyticsEndpoint();
