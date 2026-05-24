const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.update({
  where: { email: 'admin@ecommerce.com' },
  data: { mfaEnabled: false, mfaSecret: null }
}).then(() => console.log('MFA disabled')).catch(e => console.error(e)).finally(() => p.$disconnect());
