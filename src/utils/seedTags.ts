import { prisma } from './database';

const TAGS = [
  { label: 'competitive', color: '#CEFAFE' },    // Light cyan
  { label: 'pricing', color: '#FFE4E6' },        // Light pink
  { label: 'features', color: '#DCFCE7' },       // Light green
  { label: 'reviews', color: '#F3E8FF' },        // Light purple
  { label: 'market share', color: '#FEF3C7' },   // Light yellow
];

export async function seedTags() {
  console.log('🏷️  Seeding tags...');
  
  for (const tag of TAGS) {
    await prisma.tag.upsert({
      where: { label: tag.label },
      update: { color: tag.color },
      create: { label: tag.label, color: tag.color },
    });
    console.log(`✅ Created/updated tag: ${tag.label} (${tag.color})`);
  }
  
  console.log('🎉 Tags seeded successfully!');
}

// Run if called directly
if (require.main === module) {
  seedTags()
    .then(() => {
      console.log('Done seeding tags');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error seeding tags:', error);
      process.exit(1);
    });
}