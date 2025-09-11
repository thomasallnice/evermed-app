import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

async function main() {
  const prisma = new PrismaClient();

  // Synthetic owner IDs (mocked user IDs)
  const ownerA = crypto.randomUUID();
  const ownerB = crypto.randomUUID();

  // Person A (+ Person B for cross-tenant tests)
  const personA = await prisma.person.upsert({
    where: { id: 'person_a' },
    update: {},
    create: {
      id: 'person_a',
      ownerId: ownerA,
      givenName: 'Alex',
      familyName: 'Muster',
      birthYear: 1985,
      sexAtBirth: 'X',
      locale: 'de-DE',
    },
  });

  await prisma.person.upsert({
    where: { id: 'person_b' },
    update: {},
    create: { id: 'person_b', ownerId: ownerB, givenName: 'Berta' },
  });

  // Document A
  const docA = await prisma.document.create({
    data: {
      personId: personA.id,
      kind: 'pdf',
      topic: 'labs',
      filename: 'sample_cbc.pdf',
      storagePath: 'documents/sample_cbc.pdf',
      sha256: crypto.createHash('sha256').update('fixture:sample_cbc').digest('hex'),
    },
  });

  // Observations A
  await prisma.observation.createMany({
    data: [
      {
        personId: personA.id,
        code: '718-7', // Hemoglobin [Mass/volume] in Blood
        display: 'Hemoglobin',
        valueNum: 12.9,
        unit: 'g/dL',
        refLow: 13.5,
        refHigh: 17.5,
        effectiveAt: new Date('2025-01-05T10:00:00Z'),
        sourceDocId: docA.id,
        sourceAnchor: 'p1.t1',
      },
      {
        personId: personA.id,
        code: '2345-7', // Glucose [Mass/volume] in Serum or Plasma
        display: 'Glucose',
        valueNum: 98,
        unit: 'mg/dL',
        refLow: 70,
        refHigh: 99,
        effectiveAt: new Date('2025-01-05T10:00:00Z'),
        sourceDocId: docA.id,
        sourceAnchor: 'p1.t2',
      },
    ],
  });

  // SharePack with one item
  await prisma.sharePack.create({
    data: {
      personId: personA.id,
      title: 'Cardiology visit',
      audience: 'clinician',
      passcodeHash: 'argon2id$placeholder',
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      items: {
        create: [{ documentId: docA.id }],
      },
    },
  });

  await prisma.$disconnect();
  console.log('Seeded: persons A/B, doc A, observations, share pack');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

