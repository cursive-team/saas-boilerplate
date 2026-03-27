import { prisma } from './index.js';

async function main() {
  console.log('Seeding database...');

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: false,
    },
  });

  // Create account for test user (password is "password123" hashed with bcrypt)
  // Check if account exists first, then create if not
  const existingAccount = await prisma.account.findFirst({
    where: { userId: user.id, providerId: 'credential' },
  });

  if (!existingAccount) {
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: 'credential',
        // This is a pre-hashed password for "password123" - only for development
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYXxlxlxlxlx',
      },
    });
  }

  console.log('Created user:', user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
