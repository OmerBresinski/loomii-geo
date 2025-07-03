import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log('Seeding database...');

  const company = await prisma.company.create({
    data: {
      name: 'Moonpay',
      domain: 'moonpay.com',
      topics: {
        create: [
          {
            name: 'Defi',
            prompts: {
              create: [
                { text: 'Which is the best app for trading DeFi tokens?' },
                { text: 'Where can I trade DeFi tokens?' },
              ],
            },
          },
          {
            name: 'General',
            prompts: {
              create: [
                { text: "What's the best crypto app?" },
                { text: 'Where can I buy bitcoin with apple pay?' },
              ],
            },
          },
        ],
      },
    },
    include: {
      topics: {
        include: {
          prompts: true,
        },
      },
    },
  });

  console.log('Database seeded successfully!');
  console.log(`Created company: ${company.name} (ID: ${company.id})`);
  company.topics.forEach(topic => {
    console.log(`  - Topic: ${topic.name} (ID: ${topic.id})`);
    topic.prompts.forEach(prompt => {
      console.log(`    - Prompt: "${prompt.text}" (ID: ${prompt.id})`);
    });
  });
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
