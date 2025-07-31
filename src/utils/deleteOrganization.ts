import { prisma } from './database';

/**
 * Deletes an organization and all its related data
 * 
 * Deletion order (to respect foreign key constraints):
 * 1. MentionDetail (references CompanyMention, Company)
 * 2. CompanyMention (references Company)
 * 3. Mention (references Company, Prompt)
 * 4. PromptRun (references Prompt)
 * 5. PromptTag (references Prompt)
 * 6. Prompt (references Company)
 * 7. Company (references Organization)
 * 8. User (references Organization)
 * 9. Organization
 */
export async function deleteOrganization(organizationId: string): Promise<void> {
  console.log(`🗑️  Starting deletion of organization: ${organizationId}`);

  // First, verify the organization exists and get its details
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      company: true,
      users: true,
    },
  });

  if (!organization) {
    throw new Error(`Organization with ID ${organizationId} not found`);
  }

  console.log(`📋 Organization found: ${organization.name} (${organization.domain})`);
  console.log(`👥 Users: ${organization.users.length}`);
  console.log(`🏢 Company: ${organization.company ? `${organization.company.name} (ID: ${organization.company.id})` : 'None'}`);

  if (!organization.company) {
    console.log('⚠️  No company associated with this organization');
    
    // Still delete users and organization
    console.log('🗑️  Deleting users...');
    await prisma.user.deleteMany({
      where: { organizationId },
    });

    console.log('🗑️  Deleting organization...');
    await prisma.organization.delete({
      where: { id: organizationId },
    });

    console.log('✅ Organization deletion completed (no company data)');
    return;
  }

  const companyId = organization.company.id;

  try {
    // Start transaction for atomic deletion
    await prisma.$transaction(async (tx) => {
      // 1. Delete MentionDetail records
      console.log('🗑️  [1/9] Deleting mention details...');
      const mentionDetailsDeleted = await tx.mentionDetail.deleteMany({
        where: { companyId },
      });
      console.log(`    Deleted ${mentionDetailsDeleted.count} mention details`);

      // 2. Delete CompanyMention records
      console.log('🗑️  [2/9] Deleting company mentions...');
      const companyMentionsDeleted = await tx.companyMention.deleteMany({
        where: { companyId },
      });
      console.log(`    Deleted ${companyMentionsDeleted.count} company mentions`);

      // 3. Delete Mention records (from the recentMentions relationship)
      console.log('🗑️  [3/9] Deleting mentions...');
      const mentionsDeleted = await tx.mention.deleteMany({
        where: { companyId },
      });
      console.log(`    Deleted ${mentionsDeleted.count} mentions`);

      // 4. Get all prompts for this company to delete related data
      const prompts = await tx.prompt.findMany({
        where: { companyId },
        select: { id: true },
      });
      console.log(`📋 Found ${prompts.length} prompts to process`);

      if (prompts.length > 0) {
        const promptIds = prompts.map(p => p.id);

        // 4a. Delete PromptRun records
        console.log('🗑️  [4/9] Deleting prompt runs...');
        const promptRunsDeleted = await tx.promptRun.deleteMany({
          where: { promptId: { in: promptIds } },
        });
        console.log(`    Deleted ${promptRunsDeleted.count} prompt runs`);

        // 4b. Delete PromptTag records
        console.log('🗑️  [5/9] Deleting prompt tags...');
        const promptTagsDeleted = await tx.promptTag.deleteMany({
          where: { promptId: { in: promptIds } },
        });
        console.log(`    Deleted ${promptTagsDeleted.count} prompt tags`);
      }

      // 5. Delete Prompt records
      console.log('🗑️  [6/9] Deleting prompts...');
      const promptsDeleted = await tx.prompt.deleteMany({
        where: { companyId },
      });
      console.log(`    Deleted ${promptsDeleted.count} prompts`);

      // 6. Delete Company record
      console.log('🗑️  [7/9] Deleting company...');
      await tx.company.delete({
        where: { id: companyId },
      });
      console.log(`    Deleted company: ${organization.company.name}`);

      // 7. Delete User records
      console.log('🗑️  [8/9] Deleting users...');
      const usersDeleted = await tx.user.deleteMany({
        where: { organizationId },
      });
      console.log(`    Deleted ${usersDeleted.count} users`);

      // 8. Delete Organization record
      console.log('🗑️  [9/9] Deleting organization...');
      await tx.organization.delete({
        where: { id: organizationId },
      });
      console.log(`    Deleted organization: ${organization.name}`);
    });

    console.log('✅ Organization and all related data deleted successfully!');

  } catch (error) {
    console.error('❌ Error during deletion:', error);
    throw error;
  }
}

// Script execution logic
async function main() {
  const organizationId = process.argv[2];

  if (!organizationId) {
    console.error('❌ Error: Organization ID is required');
    console.log('Usage: npm run delete:organization <organizationId>');
    console.log('Example: npm run delete:organization clq1234567890abcdef');
    process.exit(1);
  }

  try {
    await deleteOrganization(organizationId);
    console.log('🎉 Script completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}