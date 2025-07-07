import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log('Seeding database...');

  const organization = await prisma.organization.create({
    data: {
      name: 'MoonPay',
      domain: 'moonpay.com',
      id: 'org_2zQ7HOteaRAEoKhViL1GK4Jcj4s',
    },
  });

  const company = await prisma.company.create({
    data: {
      name: 'MoonPay',
      domain: 'moonpay.com',
      organizationId: organization.id,
      topics: {
        create: [
          {
            name: 'Payment Processing',
            prompts: {
              create: [
                {
                  text: 'Which are the latest crypto companies that are authorized with the New York Bitlicense? ',
                },
                { text: 'What are the top 3 crypto apps?' },
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
