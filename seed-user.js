require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.user.findMany();
    console.log('Found users:', users.length);
    if (users.length > 0) {
      for (const user of users) {
        const hasMembership = await prisma.membership.findFirst({ where: { userId: user.id } });
        if (!hasMembership) {
          console.log(`Creating company for user ${user.email}`);
          const company = await prisma.company.create({
            data: { name: 'Demo Company', slug: 'demo-company-' + user.id.slice(0, 5) }
          });
          await prisma.membership.create({
            data: { userId: user.id, companyId: company.id, role: 'OWNER' }
          });
          // create a subscription plan
          const plan = await prisma.subscriptionPlan.findFirst({ where: { code: 'pro' } });
          if (plan) {
            await prisma.companySubscription.create({
              data: { companyId: company.id, planId: plan.id, status: 'ACTIVE' }
            });
          }
          console.log(`Successfully created company and subscription for ${user.email}`);
        } else {
          console.log(`User ${user.email} already has a company.`);
        }
      }
    } else {
      console.log('No users found in database.');
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
seed();
