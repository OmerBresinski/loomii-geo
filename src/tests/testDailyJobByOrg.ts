import { runDailyVisibilityJobForOrganization } from '../jobs/dailyVisibility';
import { prisma } from '../utils/database';

/**
 * Test script to run the daily visibility job for a specific organization
 * 
 * Usage: bun run test:daily-org <organizationId>
 * Example: bun run test:daily-org clq1234567890abcdef
 */
async function main() {
  const organizationId = process.argv[2];

  if (!organizationId) {
    console.error('❌ Error: Organization ID is required');
    console.log('Usage: bun run test:daily-org <organizationId>');
    console.log('Example: bun run test:daily-org clq1234567890abcdef');
    process.exit(1);
  }

  console.log(`🧪 Testing daily visibility job for organization: ${organizationId}`);

  try {
    // Verify organization exists first
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        company: {
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
        },
        users: true,
      },
    });

    if (!organization) {
      console.error(`❌ Organization with ID ${organizationId} not found`);
      process.exit(1);
    }

    console.log(`📋 Organization: ${organization.name} (${organization.domain})`);
    console.log(`👥 Users: ${organization.users.length}`);
    
    if (organization.company) {
      console.log(`🏢 Company: ${organization.company.name} (ID: ${organization.company.id})`);
      console.log(`📝 Active prompts: ${organization.company.prompts.length}`);
      
      if (organization.company.prompts.length === 0) {
        console.log('⚠️  No active prompts found for this organization');
        console.log('💡 Tip: Create some prompts first using the prompts API');
        process.exit(0);
      }
    } else {
      console.log('⚠️  No company associated with this organization');
      process.exit(0);
    }

    // Run the daily job for this organization
    await runDailyVisibilityJobForOrganization(organizationId);
    
    console.log('🎉 Test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}