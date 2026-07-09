const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient();
client.user.findMany().then(users => {
  console.log(JSON.stringify(users, null, 2));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
