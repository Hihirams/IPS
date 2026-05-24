const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const total = await prisma.product.count();
  const syscom = await prisma.product.count({ where: { syscomId: { not: null } } });
  const withImages = await prisma.product.count({
    where: {
      syscomId: { not: null },
      NOT: { images: { equals: [] } },
    },
  });
  const sample = await prisma.product.findMany({
    where: { syscomId: { not: null } },
    select: { sku: true, images: true, categoryId: true },
    take: 3,
  });
  console.log(JSON.stringify({ total, syscom, withImages, sample }, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
