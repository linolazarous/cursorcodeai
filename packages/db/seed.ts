import { prisma } from './lib/prisma';

async function main() {
  console.log('🌱 Seeding database...');

  // First user is super_admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@cursorcode.ai' },
    update: {},
    create: {
      email: 'admin@cursorcode.ai',
      name: 'CursorCode Super Admin',
      roles: ['super_admin'], // First user is super_admin
      plan: 'ultra',
      credits: 5000,
      totpEnabled: true,
    },
  });

  console.log('✅ Seeding completed!');
  console.log(`   Super Admin: ${superAdmin.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
