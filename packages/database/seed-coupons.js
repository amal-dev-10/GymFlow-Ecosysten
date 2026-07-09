// Demo data for PLT-006 Subscription Assignment & Lifecycle — coupon catalog
// plus a couple of redemptions against existing demo organizations so the
// Coupons deliverable and the Subscription tab's "Applied Coupons" section
// have real data. Idempotent: coupon codes are unique, redemptions are
// skipped if one already exists for the pairing.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const d = (offsetDays) => new Date(now + offsetDays * DAY);

const COUPONS = [
  { code: 'WELCOME20', description: '20% off the first billing cycle for new organizations.', discountType: 'PERCENTAGE', discountValue: 20, stackable: false, validUntil: d(180) },
  { code: 'LAUNCH50', description: 'Launch promo — 50% off, single use per organization.', discountType: 'PERCENTAGE', discountValue: 50, maxRedemptions: 25, stackable: false, validUntil: d(30) },
  { code: 'FLAT25USD', description: 'Flat $25 off any invoice.', discountType: 'FIXED', discountValue: 25, currency: 'USD', stackable: true, validUntil: d(365) },
  { code: 'PARTNER10', description: 'Reseller partner discount — stackable with other offers.', discountType: 'PERCENTAGE', discountValue: 10, stackable: true, validUntil: null },
  { code: 'EXPIRED15', description: 'Old spring promo, kept for audit history.', discountType: 'PERCENTAGE', discountValue: 15, stackable: false, validUntil: d(-10), isActive: false },
];

async function main() {
  console.log('--- Coupons Seed Started ---');

  const created = {};
  for (const c of COUPONS) {
    const coupon = await prisma.coupon.upsert({
      where: { code: c.code },
      update: {},
      create: { ...c, isActive: c.isActive ?? true },
    });
    created[c.code] = coupon;
  }
  console.log(`Seeded ${COUPONS.length} coupons.`);

  // Redeem a couple against real demo orgs so the org-level Subscription tab
  // has something to show in "Applied Coupons".
  const targets = [
    { orgSlug: 'demo-fitzone-studios', code: 'WELCOME20' },
    { orgSlug: 'demo-sydney-barbell-club', code: 'FLAT25USD' },
  ];

  for (const t of targets) {
    const org = await prisma.organization.findUnique({ where: { slug: t.orgSlug } });
    if (!org) continue;
    const sub = await prisma.organizationSubscription.findFirst({ where: { organizationId: org.id }, include: { plan: true }, orderBy: { startDate: 'desc' } });
    if (!sub) continue;

    const existing = await prisma.couponRedemption.findFirst({ where: { subscriptionId: sub.id, couponId: created[t.code].id, removedAt: null } });
    if (existing) {
      console.log(`  skip — ${t.code} already redeemed for ${t.orgSlug}`);
      continue;
    }

    const coupon = created[t.code];
    const discountApplied = coupon.discountType === 'PERCENTAGE' ? Math.round(sub.plan.price * (coupon.discountValue / 100) * 100) / 100 : coupon.discountValue;

    await prisma.$transaction([
      prisma.couponRedemption.create({ data: { couponId: coupon.id, organizationId: org.id, subscriptionId: sub.id, discountApplied } }),
      prisma.coupon.update({ where: { id: coupon.id }, data: { redemptionCount: { increment: 1 } } }),
    ]);
    console.log(`  redeemed ${t.code} for ${t.orgSlug} (discount ${discountApplied})`);
  }

  console.log('--- Coupons Seed Complete ---');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
