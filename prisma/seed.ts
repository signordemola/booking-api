import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/utils/password';
import { UserRole } from 'generated/prisma/enums';

const main = async () => {
  console.log('🌱 Seeding database...');

  const hashedPassword = await hashPassword('Password123!');

  const owner = await prisma.user.create({
    data: {
      email: 'abbey@elitebarbershop.com',
      firstName: 'Abiodun',
      lastName: 'Bello',
      passwordHash: hashedPassword,
      role: UserRole.BUSINESS_OWNER,
      emailVerified: true,
      phoneNumber: '+2348012345678',
    },
  });

  console.log('✅ Created business owner:', owner.email);
};

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
