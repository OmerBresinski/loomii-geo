import { prisma } from './database';

const TAGS = [
  { label: 'competitive', color: '#FFB3BA' },    // Light pink
  { label: 'pricing', color: '#BAFFC9' },        // Light green
  { label: 'features', color: '#BAE1FF' },       // Light blue
  { label: 'reviews', color: '#FFFFBA' },        // Light yellow
  { label: 'market share', color: '#E1BAFF' },   // Light purple
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