import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const person = await prisma.person.upsert({
    where: { id: 'test-person' },
    update: { ownerId: 'test-user-id' },
    create: {
      id: 'test-person',
      ownerId: 'test-user-id',
      givenName: 'Test',
      familyName: 'User',
      birthYear: 1990,
      sexAtBirth: 'X',
      locale: 'de-DE',
    },
  });

  console.log('Created/updated test person:', person);
  await prisma.$disconnect();
}

main().catch(console.error);
