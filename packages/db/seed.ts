import { prisma } from './prisma/client';

async function main() {
  console.log('🌱 Seeding database...');

  // ==========================
  // Super Admin User
  // ==========================
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@cursorcode.ai' },
    update: {},
    create: {
      email: 'admin@cursorcode.ai',
      name: 'CursorCode Super Admin',
      roles: ['admin', 'super_admin'],
      plan: 'ultra',
      credits: 5000,
      totpEnabled: false,
    },
  });

  // Link Super Admin to Google and GitHub OAuth (dummy IDs for testing)
  await prisma.account.upsert({
    where: { provider_providerAccountId: { provider: 'google', providerAccountId: 'google-admin-id' } },
    update: {},
    create: {
      userId: superAdmin.id,
      type: 'oauth',
      provider: 'google',
      providerAccountId: 'google-admin-id',
    },
  });

  await prisma.account.upsert({
    where: { provider_providerAccountId: { provider: 'github', providerAccountId: 'github-admin-id' } },
    update: {},
    create: {
      userId: superAdmin.id,
      type: 'oauth',
      provider: 'github',
      providerAccountId: 'github-admin-id',
    },
  });

  // ==========================
  // Demo User
  // ==========================
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@cursorcode.ai' },
    update: {},
    create: {
      email: 'demo@cursorcode.ai',
      name: 'Demo User',
      roles: ['user'],
      plan: 'pro',
      credits: 150,
      totpEnabled: false,
    },
  });

  // Link Demo User to Google and GitHub OAuth (dummy IDs for testing)
  await prisma.account.upsert({
    where: { provider_providerAccountId: { provider: 'google', providerAccountId: 'google-demo-id' } },
    update: {},
    create: {
      userId: demoUser.id,
      type: 'oauth',
      provider: 'google',
      providerAccountId: 'google-demo-id',
    },
  });

  await prisma.account.upsert({
    where: { provider_providerAccountId: { provider: 'github', providerAccountId: 'github-demo-id' } },
    update: {},
    create: {
      userId: demoUser.id,
      type: 'oauth',
      provider: 'github',
      providerAccountId: 'github-demo-id',
    },
  });

  console.log('✅ Seeding completed!');
  console.log(`   Super Admin: ${superAdmin.email}`);
  console.log(`   Demo User: ${demoUser.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
