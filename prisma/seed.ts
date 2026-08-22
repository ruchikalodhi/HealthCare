import { PrismaClient, Role, AppointmentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with Phase 5 demo data...');

  // 1. Create Admin
  const adminEmail = 'admin@healthcare.local';
  const hashedAdminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Principal Clinic Administrator',
      password: hashedAdminPassword,
      role: Role.ADMIN,
    },
  });
  console.log(`Admin seeded: ${admin.email}`);

  // 2. Create Doctors
  const doctorData = [
    {
      email: 'doctor.smith@healthcare.local',
      name: 'Dr. Jane Smith',
      password: 'doctor123',
      specialization: 'Cardiology',
      workingHoursStart: '09:00',
      workingHoursEnd: '17:00',
      slotDuration: 30,
      leaveDays: ['2026-09-01', '2026-09-02'],
    },
    {
      email: 'doctor.jones@healthcare.local',
      name: 'Dr. Robert Jones',
      password: 'doctor123',
      specialization: 'Dermatology',
      workingHoursStart: '10:00',
      workingHoursEnd: '16:00',
      slotDuration: 15,
      leaveDays: ['2026-09-10'],
    },
  ];

  const doctors = [];
  for (const doc of doctorData) {
    const hashedPassword = await bcrypt.hash(doc.password, 10);
    const doctorUser = await prisma.user.upsert({
      where: { email: doc.email },
      update: {
        doctorProfile: {
          upsert: {
            create: {
              specialization: doc.specialization,
              workingHoursStart: doc.workingHoursStart,
              workingHoursEnd: doc.workingHoursEnd,
              slotDuration: doc.slotDuration,
              leaveDays: doc.leaveDays,
            },
            update: {
              specialization: doc.specialization,
              workingHoursStart: doc.workingHoursStart,
              workingHoursEnd: doc.workingHoursEnd,
              slotDuration: doc.slotDuration,
              leaveDays: doc.leaveDays,
            },
          },
        },
      },
      create: {
        email: doc.email,
        name: doc.name,
        password: hashedPassword,
        role: Role.DOCTOR,
        doctorProfile: {
          create: {
            specialization: doc.specialization,
            workingHoursStart: doc.workingHoursStart,
            workingHoursEnd: doc.workingHoursEnd,
            slotDuration: doc.slotDuration,
            leaveDays: doc.leaveDays,
          },
        },
      },
      include: {
        doctorProfile: true,
      },
    });
    doctors.push(doctorUser);
    console.log(`Doctor seeded: ${doctorUser.email}`);
  }

  // 3. Create Patients
  const patientData = [
    {
      email: 'patient.alice@healthcare.local',
      name: 'Alice Patient',
      password: 'patient123',
    },
    {
      email: 'patient.bob@healthcare.local',
      name: 'Bob Patient',
      password: 'patient123',
    },
  ];

  const patients = [];
  for (const pat of patientData) {
    const hashedPassword = await bcrypt.hash(pat.password, 10);
    const patientUser = await prisma.user.upsert({
      where: { email: pat.email },
      update: {},
      create: {
        email: pat.email,
        name: pat.name,
        password: hashedPassword,
        role: Role.PATIENT,
      },
    });
    patients.push(patientUser);
    console.log(`Patient seeded: ${patientUser.email}`);
  }

  const smithProfile = doctors[0].doctorProfile!;
  const jonesProfile = doctors[1].doctorProfile!;

  // 4. Create Appointments
  // Appointment A: Upcoming appointment for Alice with Dr. Smith
  const apptADate = new Date();
  apptADate.setDate(apptADate.getDate() + 2);
  apptADate.setHours(10, 0, 0, 0);

  const existingApptA = await prisma.appointment.findFirst({
    where: { patientId: patients[0].id, doctorProfileId: smithProfile.id },
  });

  if (!existingApptA) {
    await prisma.appointment.create({
      data: {
        patientId: patients[0].id,
        doctorProfileId: smithProfile.id,
        dateTime: apptADate,
        status: AppointmentStatus.BOOKED,
        symptoms: 'Experiencing regular chest pressure and slight shortness of breath when running.',
        aiSummary: {
          create: {
            urgency: 'URGENT',
            chiefComplaint: 'Exercised-induced chest discomfort accompanied by mild dyspnea.',
            suggestedQuestions: [
              'Does the pressure radiate to your shoulder or arm?',
              'Do you experience this when resting or only during workouts?',
              'Have you noticed any swelling in your ankles?',
            ],
            preVisitSummary: 'Triage: URGENT. Patient presents with chest pain during workouts. Run ECG and check stress metrics.',
            postVisitSummary: 'Clinical checkup pending.',
          },
        },
      },
    });
    console.log('Alice Scheduled Appointment created.');
  }

  // Appointment B: Completed appointment for Bob with Dr. Jones (with medication schedule)
  const apptBDate = new Date();
  apptBDate.setDate(apptBDate.getDate() - 1);
  apptBDate.setHours(14, 0, 0, 0);

  const existingApptB = await prisma.appointment.findFirst({
    where: { patientId: patients[1].id, doctorProfileId: jonesProfile.id },
  });

  if (!existingApptB) {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 10);

    await prisma.appointment.create({
      data: {
        patientId: patients[1].id,
        doctorProfileId: jonesProfile.id,
        dateTime: apptBDate,
        status: AppointmentStatus.COMPLETED,
        symptoms: 'Dry skin rashes on hands and arms, mild itching.',
        aiSummary: {
          create: {
            urgency: 'ROUTINE',
            chiefComplaint: 'Mild localized skin dermatitis presenting itching and dry rashes.',
            suggestedQuestions: [
              'Are you using any new soap or detergent?',
              'Does the rash appear anywhere else on your body?',
            ],
            preVisitSummary: 'Routine evaluation of dry localized rashes.',
            postVisitSummary: 'Diagnosed with mild allergic eczema. Instructed to apply cream daily and avoid harsh soaps.',
            lifestyleAdvice: [
              'Apply moisturizer within 3 minutes of bathing.',
              'Avoid bathing in extremely hot water.',
              'Wear loose cotton clothing.',
            ],
          },
        },
        medicationSchedules: {
          create: [
            {
              medicationName: 'Hydrocortisone 1% Cream',
              dosage: 'Thin layer application',
              frequency: 'Twice daily',
              instructions: 'Apply to itchy areas. Do not use on broken skin.',
              startDate: start,
              endDate: end,
            },
          ],
        },
      },
    });
    console.log('Bob Completed Appointment and Prescription seeded.');
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
