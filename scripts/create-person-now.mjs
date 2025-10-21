import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const userId = '54d001cc-4f64-4e52-839a-a241b1abbb5e';
const email = 'thomas.gnahm@gmail.com';

async function createPerson() {
  try {
    console.log('Creating Person record...');
    
    const person = await prisma.person.create({
      data: {
        ownerId: userId,
        fullName: email.split('@')[0],
        glucoseTargetMin: 70,
        glucoseTargetMax: 180,
      },
    });
    
    console.log('✅ Person record created successfully!');
    console.log('   Person ID:', person.id);
    console.log('   Owner ID:', person.ownerId);
    console.log('   Full Name:', person.fullName);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createPerson();
