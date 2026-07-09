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
  const users = await prisma.user.findMany({
    include: {
      organizationUsers: {
        include: {
          organization: true,
          role: true,
        },
      },
    },
  });

  console.log('USERS IN DATABASE:');
  console.dir(users, { depth: null });
}

main()
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
