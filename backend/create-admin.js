const { PrismaClient } = require('./src/generated/prisma');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  console.log('Creating admin user...');
  
  try {
    // Delete existing admin user if exists
    await prisma.admin.deleteMany({
      where: { username: 'admin' }
    });
    
    // Create admin user with password 'admin123'
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.admin.create({
      data: {
        username: 'admin',
        email: 'admin@example.com',
        passwordHash: passwordHash,
      }
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Email:', admin.email);
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();