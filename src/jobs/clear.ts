import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function clearDatabase() {
  console.log('Clearing database...');

  // The order is important to avoid foreign key constraint violations
  // ... existing code ...
  console.log('Database cleared successfully.');
}

// Allow running the script directly
if (require.main === module) {
  clearDatabase()
    .catch(e => {
      console.error('An error occurred while clearing the database:');
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
