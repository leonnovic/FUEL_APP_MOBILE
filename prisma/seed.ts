import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Check if founder user already exists
  const existingFounder = await prisma.user.findUnique({
    where: { email: 'founder@fuelpro.com' },
  });

  if (!existingFounder) {
    // Create founder user
    const hashedPassword = await bcrypt.hash('Founder@2024', 12);
    
    const founder = await prisma.user.create({
      data: {
        email: 'founder@fuelpro.com',
        name: 'FuelPro Founder',
        password: hashedPassword,
        role: 'founder',
        tier: 'enterprise',
        phone: '+254700000000',
        isActive: true,
      },
    });

    console.log('Created founder user:', founder.email);

    // Create default permissions for founder
    const permissions = [
      { action: 'create', dataType: 'station', teamScope: 'global' },
      { action: 'read', dataType: 'station', teamScope: 'global' },
      { action: 'update', dataType: 'station', teamScope: 'global' },
      { action: 'delete', dataType: 'station', teamScope: 'global' },
      { action: 'create', dataType: 'sale', teamScope: 'global' },
      { action: 'read', dataType: 'sale', teamScope: 'global' },
      { action: 'update', dataType: 'sale', teamScope: 'global' },
      { action: 'delete', dataType: 'sale', teamScope: 'global' },
      { action: 'create', dataType: 'user', teamScope: 'global' },
      { action: 'read', dataType: 'user', teamScope: 'global' },
      { action: 'update', dataType: 'user', teamScope: 'global' },
      { action: 'delete', dataType: 'user', teamScope: 'global' },
      { action: 'export', dataType: 'report', teamScope: 'global' },
    ];

    await prisma.permission.createMany({
      data: permissions.map(p => ({
        ...p,
        userId: founder.id,
        stationId: null,
      })),
    });

    console.log('Created permissions for founder');
  } else {
    console.log('Founder user already exists');
  }

  // Check if demo user exists
  const existingDemo = await prisma.user.findUnique({
    where: { email: 'demo@fuelpro.com' },
  });

  if (!existingDemo) {
    const hashedPassword = await bcrypt.hash('Demo123456', 10);
    
    const demo = await prisma.user.create({
      data: {
        email: 'demo@fuelpro.com',
        name: 'Demo User',
        password: hashedPassword,
        role: 'staff',
        tier: 'free',
        isActive: true,
      },
    });

    console.log('Created demo user:', demo.email);

    // Create default permissions for demo
    const demoPermissions = [
      { action: 'read', dataType: 'sale', teamScope: 'personal' },
      { action: 'create', dataType: 'sale', teamScope: 'personal' },
      { action: 'read', dataType: 'inventory', teamScope: 'personal' },
    ];

    await prisma.permission.createMany({
      data: demoPermissions.map(p => ({
        ...p,
        userId: demo.id,
        stationId: null,
      })),
    });

    console.log('Created permissions for demo');
  } else {
    console.log('Demo user already exists');
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });