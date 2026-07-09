import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
