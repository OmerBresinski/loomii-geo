import { runDailyVisibilityJobForOrganization } from '../jobs/dailyVisibility';

async function testFireberryVisibilityJob() {
  console.log('🚀 Testing daily visibility job for Fireberry...\n');
  
  // Fireberry's organization ID
  const fireberryOrgId = 'f779dcb0-ee08-4e7d-a309-a03ff34cce2b';
  
  try {
    await runDailyVisibilityJobForOrganization(fireberryOrgId);
    console.log('\n✅ Daily visibility job completed successfully!');
  } catch (error) {
    console.error('\n❌ Daily visibility job failed:', error);
  }
}

testFireberryVisibilityJob();