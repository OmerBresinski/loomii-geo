import { PrismaClient } from '@prisma/client';
import { seedTags } from './seedTags';

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log('Seeding database...');

  // First seed the tags
  await seedTags();

  const organization = await prisma.organization.create({
    data: {
      name: 'Binance',
      domain: 'binance.com',
      id: 'org_2zQ7HOteaRAEoKhViL1GK4Jcj4s',
    },
  });

  const company = await prisma.company.create({
    data: {
      name: 'Binance',
      domain: 'binance.com',
      organizationId: organization.id,
    },
  });

  // Get all tags for prompt creation
  const tags = await prisma.tag.findMany();
  const tagMap = new Map(tags.map(tag => [tag.label, tag.id]));

  // Create 20 diverse prompts with relevant tags (multiple tags per prompt)
  const promptsToCreate = [
    {
      text: 'Which crypto exchanges have New York BitLicense?',
      tags: ['competitive'],
    },
    {
      text: 'What are top crypto payment platforms 2025?',
      tags: ['competitive', 'market share'],
    },
    {
      text: 'How do major crypto exchange fees compare?',
      tags: ['pricing', 'competitive'],
    },
    {
      text: 'What are popular crypto on-ramp daily limits?',
      tags: ['features', 'competitive'],
    },
    {
      text: 'Which exchanges have best customer support ratings?',
      tags: ['reviews', 'competitive'],
    },
    {
      text: 'Who leads European crypto payment processor market?',
      tags: ['market share', 'competitive'],
    },
    {
      text: 'What security features do major exchanges offer?',
      tags: ['features', 'competitive'],
    },
    {
      text: 'How reliable are different crypto trading platforms?',
      tags: ['reviews'],
    },
    {
      text: 'Which exchanges lead institutional crypto custody services?',
      tags: ['market share', 'competitive'],
    },
    {
      text: 'How do crypto-fiat conversion rates vary between crypto exchanges?',
      tags: ['pricing', 'features'],
    },
  ];

  // Create all prompts with their tags
  for (const promptData of promptsToCreate) {
    const prompt = await prisma.prompt.create({
      data: {
        text: promptData.text,
        companyId: company.id,
        promptTags: {
          create: promptData.tags.map(tagLabel => ({
            tagId: tagMap.get(tagLabel)!,
          })),
        },
      },
    });
  }

  console.log(`Created ${promptsToCreate.length} prompts with relevant tags`);

  console.log('Database seeded successfully!');
  console.log(`Created company: ${company.name} (ID: ${company.id})`);
}

// Allow running the script directly
if (require.main === module) {
  seedDatabase()
    .catch(e => {
      console.error('An error occurred while seeding the database:');
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
