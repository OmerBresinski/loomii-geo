import bcrypt from 'bcrypt';
import { prisma } from './database';

async function seedFirstUser() {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'omerbres@loomii.ai' }
    });

    if (existingUser) {
      console.log('User already exists with email: omerbres@loomii.ai');
      return;
    }

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: 'org_2zQ7HOteaRAEoKhViL1GK4Jcj4s' }
    });

    if (!organization) {
      console.error('Organization with ID org_2zQ7HOteaRAEoKhViL1GK4Jcj4s not found');
      console.log('Please create the organization first or update the organization ID');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('teleb9178', 12);

    // Create the user
    const user = await prisma.user.create({
      data: {
        email: 'omerbres@loomii.ai',
        password: hashedPassword,
        firstName: 'omer',
        lastName: 'bresinski',
        organizationId: 'org_2zQ7HOteaRAEoKhViL1GK4Jcj4s'
      }
    });

    console.log('✅ First user created successfully:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Organization ID: ${user.organizationId}`);
    console.log(`   Created at: ${user.createdAt}`);

  } catch (error) {
    console.error('❌ Error seeding first user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedFirstUser();
}

export { seedFirstUser };