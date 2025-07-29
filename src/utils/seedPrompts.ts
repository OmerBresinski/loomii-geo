import { prisma } from './database';

interface PromptData {
  text: string;
  tags?: string[];
}

const defaultPrompts: PromptData[] = [
  {
    text: "What's the top 5 AI CRM in Israel?",
    tags: ['competitive', 'features'],
  },
  {
    text: 'What are the highest rated CRMs in hebrew',
    tags: ['competitive', 'reviews'],
  },
  {
    text: 'Who are the leading CRMs in israel?',
    tags: ['market share', 'competitive'],
  },
  {
    text: "What's the best CRM in hebrew with AI features?",
    tags: ['competitive', 'features'],
  },
];

async function seedPrompts(
  organizationId: string,
  prompts: PromptData[] = defaultPrompts
) {
  try {
    console.log(
      `🌱 Starting to seed prompts for organization: ${organizationId}`
    );

    // Find the company associated with this organization
    const company = await prisma.company.findUnique({
      where: { organizationId },
      include: { organization: true },
    });

    if (!company) {
      throw new Error(
        `No company found for organization ID: ${organizationId}`
      );
    }

    console.log(`📋 Found company: ${company.name} (${company.domain})`);
    console.log(`🔄 Processing ${prompts.length} prompts...`);

    for (const promptData of prompts) {
      console.log(`  📝 Creating prompt: "${promptData.text}"`);

      // Create the prompt
      const prompt = await prisma.prompt.create({
        data: {
          text: promptData.text,
          companyId: company.id,
          isActive: true,
        },
      });

      // Handle tags if provided
      if (promptData.tags && promptData.tags.length > 0) {
        console.log(`    🏷️  Looking up ${promptData.tags.length} tags...`);

        for (const tagLabel of promptData.tags) {
          // Find existing tag
          const tag = await prisma.tag.findUnique({
            where: { label: tagLabel },
          });

          if (tag) {
            // Create the prompt-tag relationship
            await prisma.promptTag.create({
              data: {
                promptId: prompt.id,
                tagId: tag.id,
              },
            });

            console.log(`      ✅ Linked existing tag: ${tagLabel}`);
          } else {
            console.log(`      ⚠️  Tag not found: ${tagLabel} (skipping)`);
          }
        }
      }

      console.log(`  ✅ Created prompt (ID: ${prompt.id})`);
    }

    console.log(
      `🎉 Successfully seeded ${prompts.length} prompts for ${company.name}!`
    );

    return {
      success: true,
      companyName: company.name,
      promptsCreated: prompts.length,
    };
  } catch (error) {
    console.error('❌ Error seeding prompts:', error);
    throw error;
  }
}

// CLI usage
async function main() {
  const organizationId = process.argv[2];

  if (!organizationId) {
    console.error('❌ Please provide an organization ID');
    console.log('Usage: npm run seed:prompts <organizationId>');
    process.exit(1);
  }

  try {
    await seedPrompts(organizationId);
    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Export for programmatic usage
export { seedPrompts, defaultPrompts };
export type { PromptData };

// Run if called directly
if (require.main === module) {
  main();
}
