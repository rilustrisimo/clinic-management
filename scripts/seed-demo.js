/**
 * Demo Seed Data - 1 Patient + 1 Appointment
 * 
 * Creates minimal data for UI smoke testing:
 * - 1 demo patient (Maria Santos)
 * - 1 appointment for today at 10:00 AM
 * 
 * Run: node scripts/seed-demo.js
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './packages/db/.env' });

// Simple CUID generator
function createId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `c${timestamp}${randomPart}`;
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding demo data...\n');

  // Get an existing Admin user
  const adminUser = await prisma.user.findFirst({
    where: {
      UserRole: {
        some: {
          Role: {
            name: 'Admin'
          }
        }
      }
    }
  });

  if (!adminUser) {
    console.error('❌ No Admin user found.');
    console.error('💡 Run: node scripts/sync-supabase-users.js && node scripts/assign-admin-role.js');
    process.exit(1);
  }

  console.log(`✅ Found admin user: ${adminUser.email}`);

  // Check if we need a Provider for the appointment
  let providerUser = await prisma.user.findFirst({
    where: {
      UserRole: {
        some: {
          Role: {
            name: 'Provider'
          }
        }
      }
    }
  });

  // If no provider exists, use the admin (they can have multiple roles)
  if (!providerUser) {
    console.log('⚠️  No Provider found, using Admin as provider');
    providerUser = adminUser;
  } else {
    console.log(`✅ Found provider: ${providerUser.email}`);
  }

  // 1. Create demo patient
  console.log('\n📝 Creating demo patient...');
  
  let demoPatient = await prisma.patient.findUnique({
    where: { mrn: 'DEMO-001' }
  });

  if (!demoPatient) {
    const patientId = createId();
    const changeLogId = createId();
    console.log(`Generated patient ID: ${patientId}`);
    
    // Use transaction to insert patient and changelog entry
    await prisma.$transaction(async (tx) => {
      // Insert patient using raw SQL  
      await tx.$executeRaw`
        INSERT INTO "Patient" (id, mrn, "firstName", "lastName", "middleName", dob, gender, phone, email, address, "createdAt", "updatedAt", "createdById")
        VALUES (${patientId}, 'DEMO-001', 'Maria', 'Santos', 'Cruz', '1985-06-15'::timestamp, 'female', '+63 912 345 6789', 'maria.santos@example.com', '123 Rizal Avenue, Barangay San Roque, Manila, Metro Manila', NOW(), NOW(), ${adminUser.id})
        ON CONFLICT (mrn) DO NOTHING
      `;
      
      // Insert corresponding changelog entry
      const payloadJson = JSON.stringify({
        id: patientId,
        mrn: 'DEMO-001',
        firstName: 'Maria',
        lastName: 'Santos'
      });
      
      await tx.$executeRaw`
        INSERT INTO "ChangeLog" (id, "tableName", "rowId", action, payload, "createdAt")
        VALUES (${changeLogId}, 'Patient', ${patientId}, 'insert', ${payloadJson}::jsonb, NOW())
      `;
    });
    
    // Fetch the created patient
    demoPatient = await prisma.patient.findUnique({
      where: { mrn: 'DEMO-001' }
    });
    
    console.log(`✅ Patient created: ${demoPatient.firstName} ${demoPatient.lastName} (MRN: ${demoPatient.mrn})`);
  } else {
    console.log(`ℹ️  Patient already exists: ${demoPatient.firstName} ${demoPatient.lastName} (MRN: ${demoPatient.mrn})`);
  }

  // 2. Create appointment for today
  console.log('\n📅 Creating demo appointment...');
  
  const today = new Date();
  const appointmentStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0); // 10:00 AM
  const appointmentEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30, 0);   // 10:30 AM

  const demoAppointment = await prisma.appointment.upsert({
    where: {
      id: 'demo-appt-001'
    },
    update: {
      startsAt: appointmentStart,
      endsAt: appointmentEnd
    },
    create: {
      id: 'demo-appt-001',
      patientId: demoPatient.id,
      providerId: providerUser.id,
      startsAt: appointmentStart,
      endsAt: appointmentEnd,
      status: 'scheduled',
      notes: 'Demo appointment for UI testing',
      updatedAt: new Date()
    }
  });

  console.log(`✅ Appointment created: ${appointmentStart.toLocaleString()} - ${demoAppointment.notes}`);

  console.log('\n✨ Demo data seeding complete!\n');
  console.log('📊 Summary:');
  console.log(`   - Patient: ${demoPatient.firstName} ${demoPatient.lastName}`);
  console.log(`   - MRN: ${demoPatient.mrn}`);
  console.log(`   - Appointment: Today at ${appointmentStart.toLocaleTimeString()}`);
  console.log(`   - Provider: ${providerUser.email}`);
  console.log(`   - Status: ${demoAppointment.status}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
