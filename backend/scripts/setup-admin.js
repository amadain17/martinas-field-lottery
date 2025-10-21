const { PrismaClient } = require('../src/generated/prisma');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function setupAdmin() {
  try {
    console.log('🔧 Setting up admin user...');
    
    // Check if admin users exist
    const adminCount = await prisma.admin.count();
    console.log(`Found ${adminCount} admin users in database`);
    
    if (adminCount === 0) {
      console.log('Creating default admin user...');
      
      const defaultUsername = 'admin';
      const defaultPassword = 'admin123';
      const defaultEmail = 'admin@martinasfield.com';
      
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      const admin = await prisma.admin.create({
        data: {
          username: defaultUsername,
          email: defaultEmail,
          passwordHash: hashedPassword
        }
      });
      
      console.log('✅ Default admin user created successfully!');
      console.log('');
      console.log('Admin Login Credentials:');
      console.log('========================');
      console.log('Username:', defaultUsername);
      console.log('Password:', defaultPassword);
      console.log('Email:', defaultEmail);
      console.log('');
      console.log('🌐 Access admin console at: http://localhost:5174/admin');
      
    } else {
      console.log('Admin users already exist:');
      const admins = await prisma.admin.findMany({
        select: { username: true, email: true, id: true }
      });
      
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. Username: ${admin.username} | Email: ${admin.email}`);
      });
      
      console.log('');
      console.log('🌐 Access admin console at: http://localhost:5174/admin');
    }
    
  } catch (error) {
    console.error('❌ Error setting up admin:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdmin();