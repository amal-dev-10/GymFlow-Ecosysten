const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  console.log('Checking database status before seeding...');
  const orgCount = await prisma.organization.count();

  const runScript = (filename) => {
    console.log(`Running seed: ${filename}...`);
    execSync(`node ${path.join(__dirname, filename)}`, { stdio: 'inherit' });
  };

  // Always seed roles/permissions (idempotent upserts)
  runScript('seed-platform-roles.js');

  // Always seed platform users (idempotent / creates superadmin if missing)
  runScript('seed-platform-users.js');

  // If no organization exists, run the main populate/seed scripts
  if (orgCount === 0) {
    console.log('No organizations found. Running database population seeds...');
    runScript('populate.js');
    runScript('seed-global-settings.js');
    runScript('seed-platform-orgs.js');
    runScript('seed-plan-catalogs.js');
    runScript('seed-coupons.js');
    runScript('seed-notifications-center.js');
    runScript('seed-automation-jobs.js');
    runScript('seed-support-center.js');
    runScript('seed-audit-center.js');
    runScript('seed-revenue-center.js');
    runScript('seed-lifecycle-demo.js');
  } else {
    console.log('Database already populated. Skipping heavy seed data.');
  }
}

main()
  .catch((err) => {
    console.error('Seeding process failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
