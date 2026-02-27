import { prisma } from './lib/prisma';

async function main() {
  console.log('🌱 Seeding database...');

  // Admin User (first user becomes super_admin)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cursorcode.ai' },
    update: {},
    create: {
      email: 'admin@cursorcode.ai',
      name: 'CursorCode Admin',
      roles: ['super_admin'], // OAuth-first user becomes super_admin
      plan: 'ultra',
      credits: 5000,
      totp_enabled: false, // optional, can enable later if using 2FA
    },
  });

  // Demo User
  const demo = await prisma.user.upsert({
    where: { email: 'demo@cursorcode.ai' },
    update: {},
    create: {
      email: 'demo@cursorcode.ai',
      name: 'Demo User',
      roles: ['user'],
      plan: 'pro',
      credits: 150,
      totp_enabled: false,
    },
  });

  // Example Project
  await prisma.project.upsert({
    where: { id: 'proj_demo_1' },
    update: {},
    create: {
      id: 'proj_demo_1',
      title: "AI SaaS Dashboard",
      prompt: "Build a modern AI SaaS dashboard with real-time analytics, user management, and Stripe payments",
      status: "completed",
      userId: demo.id,
      deploy_url: "https://demo.cursorcode.ai",
      preview_url: "https://preview.cursorcode.ai/demo",
      code_repo_url: "https://github.com/cursorcode/demo-saas",
      progress: 100,
      logs: ["✅ Architecture designed", "✅ Code generated", "✅ Deployed to Render"],
    },
  });

  console.log('✅ Seeding completed!');
  console.log(`   Admin: ${admin.email}`);
  console.log(`   Demo User: ${demo.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
