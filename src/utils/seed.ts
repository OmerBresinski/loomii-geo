import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log('Seeding database...');

  const organization = await prisma.organization.create({
    data: {
      name: 'Yael Group',
      domain: 'yaelgroup.com',
      id: 'org_2zQ7HOteaRAEoKhViL1GK4Jcj4s',
    },
  });

  const company = await prisma.company.create({
    data: {
      name: 'Yael Group',
      domain: 'yaelgroup.com',
      organizationId: organization.id,
      topics: {
        create: [
          {
            name: 'Salesforce',
            prompts: {
              create: [
                {
                  text: 'Who is the best Salesforce partner in Israel?',
                },
                {
                  text: 'Which company should I choose for my Salesforce implementation?',
                },
              ],
            },
          },
          {
            name: 'NetSuite',
            prompts: {
              create: [
                { text: 'Who is the best NetSuite partner in Israel?' },
                {
                  text: 'Which company should I choose for my NetSuite implementation?',
                },
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
