// Demo data for PLT-006 — exercises subscription lifecycle states that don't
// otherwise occur in the PLT-004 seed (Grace_Period, Paused, Pending_Payment,
// a refunded payment, and one hand-negotiated Enterprise deal) so every
// status/badge in the Subscription workspace has a real example to render.
// Idempotent: guarded by checking current state before mutating.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const d = (offsetDays) => new Date(now + offsetDays * DAY);

async function subFor(slug) {
  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return null;
  return prisma.organizationSubscription.findFirst({ where: { organizationId: org.id }, orderBy: { startDate: 'desc' } });
}

async function main() {
  console.log('--- Lifecycle Demo Seed Started ---');

  // Grace Period: Highland Health Hub (already suspended org-wide + failed payment) —
  // put its subscription itself into grace so the Subscription tab shows the countdown.
  const highland = await subFor('demo-highland-health-hub');
  if (highland && highland.status !== 'Grace_Period') {
    await prisma.organizationSubscription.update({ where: { id: highland.id }, data: { status: 'Grace_Period', graceUntil: d(5), autoRenew: false } });
    console.log('  Highland Health Hub → Grace_Period (graceUntil in 5 days)');
  }

  // Paused: Coastal CrossFit pauses billing temporarily (season closure).
  const coastal = await subFor('demo-coastal-crossfit');
  if (coastal && coastal.status !== 'Paused') {
    await prisma.organizationSubscription.update({ where: { id: coastal.id }, data: { status: 'Paused', pausedAt: d(-3), autoRenew: false } });
    console.log('  Coastal CrossFit → Paused');
  }

  // Pending Payment: Alpine Peak Fitness awaiting its first charge to clear.
  const alpine = await subFor('demo-alpine-peak-fitness');
  if (alpine && alpine.status !== 'Pending_Payment') {
    await prisma.organizationSubscription.update({ where: { id: alpine.id }, data: { status: 'Pending_Payment' } });
    console.log('  Alpine Peak Fitness → Pending_Payment');
  }

  // Enterprise custom deal: Lion City Athletics (already on the Enterprise plan).
  const lionCity = await subFor('demo-lion-city-athletics');
  if (lionCity && !lionCity.isEnterpriseCustom) {
    await prisma.organizationSubscription.update({
      where: { id: lionCity.id },
      data: {
        isEnterpriseCustom: true,
        customPrice: 1450,
        privateNotes: 'Negotiated directly with regional VP. Renews annually with a 60-day notice period. Do not expose custom pricing to tenant-facing invoices.',
        dedicatedSupportContact: 'enterprise-support@gymflow.test',
        customSlaTerms: '99.9% uptime SLA, 1-hour critical response, dedicated Slack channel.',
        paymentMethod: 'Wire Transfer (Net 30)',
      },
    });
    console.log('  Lion City Athletics → Enterprise custom deal');
  }

  // Refund: give Iron Temple Gyms a partially refunded payment, creating an
  // invoice+payment pair if the earlier org seed hadn't already added one.
  const iron = await subFor('demo-iron-temple-gyms');
  if (iron) {
    let invoice = await prisma.subscriptionInvoice.findFirst({ where: { subscriptionId: iron.id }, include: { payments: true } });
    if (!invoice) {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: iron.planId } });
      invoice = await prisma.subscriptionInvoice.create({
        data: { subscriptionId: iron.id, amount: plan.price, status: 'Paid', dueDate: d(-20), paidAt: d(-19) },
        include: { payments: true },
      });
    }
    const existingPayment = invoice.payments.find((p) => p.status === 'Success' || p.status === 'Partially_Refunded');
    if (existingPayment && existingPayment.status === 'Success') {
      await prisma.subscriptionPayment.update({
        where: { id: existingPayment.id },
        data: {
          status: 'Partially_Refunded',
          refundedAmount: Math.round(existingPayment.amount * 0.25 * 100) / 100,
          refundedAt: d(-10),
          refundReason: 'Pro-rated credit for a service outage.',
        },
      });
      console.log('  Iron Temple Gyms → payment marked Partially_Refunded');
    } else if (!existingPayment) {
      await prisma.subscriptionPayment.create({
        data: {
          invoiceId: invoice.id,
          amount: invoice.amount,
          status: 'Partially_Refunded',
          paymentMethod: 'Stripe',
          transactionId: 'txn_demo_refund_001',
          refundedAmount: Math.round(invoice.amount * 0.25 * 100) / 100,
          refundedAt: d(-10),
          refundReason: 'Pro-rated credit for a service outage.',
        },
      });
      console.log('  Iron Temple Gyms → seeded a partially refunded payment');
    }
  }

  // Payment method labels for the orgs that already have "paid" invoices but
  // no payment method on the subscription yet.
  const withMethod = ['demo-fitzone-studios', 'demo-pulsefit-wellness', 'demo-sydney-barbell-club', 'demo-maple-movement'];
  for (const slug of withMethod) {
    const sub = await subFor(slug);
    if (sub && !sub.paymentMethod) {
      await prisma.organizationSubscription.update({ where: { id: sub.id }, data: { paymentMethod: 'Card ending 4242' } });
    }
  }
  console.log(`  Set a default payment method label on ${withMethod.length} subscriptions where missing.`);

  console.log('--- Lifecycle Demo Seed Complete ---');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
