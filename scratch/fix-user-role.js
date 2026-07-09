const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: 'packages/database/.env' });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  // 1. Find the global "Organization Owner" role
  let ownerRole = await prisma.role.findFirst({
    where: {
      name: 'Organization Owner',
      organizationId: null,
    },
  });

  if (!ownerRole) {
    console.log('Organization Owner role not found, creating it...');
    ownerRole = await prisma.role.create({
      data: {
        name: 'Organization Owner',
        description: 'Full access to all organizations, gyms, financial statements, and staff configurations.',
        category: 'Management',
        organizationId: null,
        gymScope: 'all',
      },
    });
  }

  console.log(`Found Organization Owner role with ID: ${ownerRole.id}`);

  // 2. Find the user by phone number
  const user = await prisma.user.findUnique({
    where: { phoneNumber: '+917902992447' },
  });

  if (!user) {
    throw new Error('User with phone number +917902992447 not found');
  }

  console.log(`Found user: ${user.fullName} (${user.id})`);

  // 3. Update all OrganizationUser records for this user to the "Organization Owner" role
  const updateResult = await prisma.organizationUser.updateMany({
    where: { userId: user.id },
    data: { roleId: ownerRole.id },
  });

  console.log(`Updated ${updateResult.count} organization user records.`);
}

main()
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
