// Demo + system data for PLT-012 Revenue & Billing Center. Seeds the
// PaymentGateway catalog, backfills salesChannel on existing
// OrganizationSubscription rows and taxAmount/taxRate on existing
// SubscriptionInvoice rows (via a country-based heuristic), and adds a
// realistic historical spread of additional invoices/payments (including
// Failed/Refunded/Disputed payments and overdue invoices) so revenue trend
// charts and reports aren't empty for older months. Idempotent: gateways
// upserted by key, backfills only touch null fields, extra invoices/payments
// are checked via a marker.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const d = (offsetDays) => new Date(now + offsetDays * DAY);

const GATEWAYS = [
  { key: 'stripe', label: 'Stripe', icon: 'CreditCard', order: 0 },
  { key: 'razorpay', label: 'Razorpay', icon: 'Wallet', order: 1 },
  { key: 'paddle', label: 'Paddle', icon: 'Package', order: 2 },
  { key: 'lemon_squeezy', label: 'Lemon Squeezy', icon: 'Citrus', order: 3 },
  { key: 'manual', label: 'Manual', icon: 'Receipt', order: 4 },
];

const SALES_CHANNELS = ['Self-serve', 'Sales-assisted', 'Partner'];

const EU_COUNTRIES = ['Germany', 'France', 'Netherlands', 'Italy', 'Spain', 'Ireland', 'Belgium', 'Austria', 'Portugal', 'Sweden', 'Denmark', 'Finland', 'Poland'];
function taxRateForCountry(country) {
  if (!country) return 0;
  if (country === 'India') return 18; // GST
  if (EU_COUNTRIES.includes(country)) return 20; // VAT
  if (country === 'United States' || country === 'Canada') return 7; // Sales Tax
  return 0;
}

async function main() {
  console.log('--- PLT-012 Revenue & Billing Center Seed Started ---');

  // --- Payment Gateway catalog ---
  for (const g of GATEWAYS) {
    await prisma.paymentGateway.upsert({ where: { key: g.key }, update: {}, create: g });
  }
  console.log(`Seeded ${GATEWAYS.length} payment gateways.`);

  // --- Normalize legacy paymentMethod casing to match the catalog's lowercase
  // keys (pre-PLT-012 seeds wrote "Stripe"/"Credit_Card" etc, capitalized) so
  // gateway-grouped reports don't split the same gateway into two buckets. ---
  const LEGACY_GATEWAY_MAP = { Stripe: 'stripe', Razorpay: 'razorpay', Paddle: 'paddle', Credit_Card: 'manual', Manual: 'manual', Manual_Invoice: 'manual' };
  let normalized = 0;
  for (const [legacy, canonical] of Object.entries(LEGACY_GATEWAY_MAP)) {
    const res = await prisma.subscriptionPayment.updateMany({ where: { paymentMethod: legacy }, data: { paymentMethod: canonical } });
    normalized += res.count;
  }
  console.log(`Normalized ${normalized} legacy payment gateway labels.`);

  // --- Backfill salesChannel on existing subscriptions ---
  const subsToBackfill = await prisma.organizationSubscription.findMany({ where: { salesChannel: null }, select: { id: true } });
  let channelsSet = 0;
  for (let i = 0; i < subsToBackfill.length; i++) {
    await prisma.organizationSubscription.update({
      where: { id: subsToBackfill[i].id },
      data: { salesChannel: SALES_CHANNELS[i % SALES_CHANNELS.length] },
    });
    channelsSet++;
  }
  console.log(`Backfilled salesChannel on ${channelsSet} subscriptions.`);

  // --- Backfill taxAmount/taxRate on existing invoices ---
  const invoicesToBackfill = await prisma.subscriptionInvoice.findMany({
    where: { taxAmount: null },
    include: { subscription: { include: { organization: { select: { country: true } } } } },
  });
  let taxesSet = 0;
  for (const inv of invoicesToBackfill) {
    const rate = taxRateForCountry(inv.subscription.organization.country);
    const taxAmount = Math.round(inv.amount * (rate / 100) * 100) / 100;
    await prisma.subscriptionInvoice.update({ where: { id: inv.id }, data: { taxRate: rate, taxAmount } });
    taxesSet++;
  }
  console.log(`Backfilled tax fields on ${taxesSet} invoices.`);

  // --- Historical invoices/payments spread (marker-gated) ---
  const marker = await prisma.subscriptionPayment.findFirst({ where: { transactionId: 'PLT012_SEED_MARKER' } });
  if (marker) {
    console.log('Historical revenue spread already seeded, skipping.');
    console.log('--- PLT-012 Revenue & Billing Center Seed Complete ---');
    return;
  }

  const activeSubs = await prisma.organizationSubscription.findMany({
    where: { status: 'Active' },
    include: { plan: true, organization: { select: { country: true } } },
    take: 12,
  });

  if (activeSubs.length === 0) {
    console.log('No active subscriptions found to seed historical invoices against - skipping.');
    console.log('--- PLT-012 Revenue & Billing Center Seed Complete ---');
    return;
  }

  const GATEWAY_CYCLE = ['stripe', 'razorpay', 'paddle', 'lemon_squeezy', 'manual'];
  let created = 0;

  for (let month = 11; month >= 0; month--) {
    for (let i = 0; i < activeSubs.length; i++) {
      // Not every org pays every month in the seed - keeps the trend looking organic.
      if ((i + month) % 3 === 0) continue;

      const sub = activeSubs[i];
      const amount = sub.isEnterpriseCustom && sub.customPrice != null ? sub.customPrice : sub.plan.price;
      if (!amount) continue; // skip Free plans

      const rate = taxRateForCountry(sub.organization.country);
      const taxAmount = Math.round(amount * (rate / 100) * 100) / 100;
      const createdAt = d(-(month * 30 + (i % 5)));
      const gateway = GATEWAY_CYCLE[(i + month) % GATEWAY_CYCLE.length];

      // Occasionally simulate a failed or disputed payment for realism.
      const isFailed = (i + month) % 13 === 0;
      const isDisputed = (i + month) % 17 === 0;

      const invoice = await prisma.subscriptionInvoice.create({
        data: {
          subscriptionId: sub.id,
          amount,
          taxRate: rate,
          taxAmount,
          status: isFailed ? 'Unpaid' : 'Paid',
          dueDate: createdAt,
          paidAt: isFailed ? null : createdAt,
          createdAt,
        },
      });

      await prisma.subscriptionPayment.create({
        data: {
          invoiceId: invoice.id,
          amount,
          status: isFailed ? 'Failed' : isDisputed ? 'Disputed' : 'Success',
          paymentMethod: gateway,
          transactionId: `${gateway}-${sub.id.slice(0, 8)}-${month}`,
          createdAt,
        },
      });
      created++;
    }
  }

  // A couple of explicit overdue invoices (Unpaid, dueDate well in the past).
  const overdueOrgs = activeSubs.slice(0, 2);
  for (const sub of overdueOrgs) {
    const amount = sub.isEnterpriseCustom && sub.customPrice != null ? sub.customPrice : sub.plan.price;
    if (!amount) continue;
    await prisma.subscriptionInvoice.create({
      data: { subscriptionId: sub.id, amount, status: 'Unpaid', dueDate: d(-20), createdAt: d(-25) },
    });
    created++;
  }

  // Refund examples on a couple of the successful payments just created.
  const refundCandidates = await prisma.subscriptionPayment.findMany({ where: { status: 'Success' }, take: 3, orderBy: { createdAt: 'asc' } });
  for (const p of refundCandidates) {
    await prisma.subscriptionPayment.update({
      where: { id: p.id },
      data: { status: 'Refunded', refundedAmount: p.amount, refundedAt: new Date(p.createdAt.getTime() + 3 * DAY), refundReason: 'Customer requested cancellation within trial window.' },
    });
  }

  // Marker row so re-runs are idempotent.
  await prisma.subscriptionPayment.create({
    data: {
      invoiceId: (await prisma.subscriptionInvoice.findFirst({ orderBy: { createdAt: 'desc' } })).id,
      amount: 0,
      status: 'Success',
      paymentMethod: 'manual',
      transactionId: 'PLT012_SEED_MARKER',
    },
  });

  console.log(`Seeded ${created} historical invoices/payments across 12 months, plus ${overdueOrgs.length} overdue invoices and ${refundCandidates.length} refunds.`);
  console.log('--- PLT-012 Revenue & Billing Center Seed Complete ---');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
