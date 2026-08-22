import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { Role, AppointmentStatus } from '@prisma/client';

import { emailQueue, calendarQueue } from '@/lib/queue/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.PATIENT) {
      return NextResponse.json({ error: 'Unauthorized. Patient account required.' }, { status: 401 });
    }

    const { doctorId, dateTime, symptoms } = await req.json();

    if (!doctorId || !dateTime || !symptoms) {
      return NextResponse.json({ error: 'doctorId, dateTime, and symptoms are required' }, { status: 400 });
    }

    const parsedDateTime = new Date(dateTime);
    if (isNaN(parsedDateTime.getTime())) {
      return NextResponse.json({ error: 'Invalid dateTime format' }, { status: 400 });
    }

    // 1. Fetch Doctor Profile
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      include: { doctorProfile: true },
    });

    if (!doctor || doctor.role !== Role.DOCTOR || !doctor.doctorProfile) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    const holdKey = `slot_hold:${doctorId}:${parsedDateTime.toISOString()}`;

    // 2. Perform verification and inserts within a database transaction
    const newAppointment = await prisma.$transaction(async (tx) => {
      // Re-verify Postgres availability
      const existingAppt = await tx.appointment.findFirst({
        where: {
          doctorProfileId: doctor.doctorProfile!.id,
          dateTime: parsedDateTime,
          status: {
            in: ['BOOKED', 'SCHEDULED'],
          },
        },
      });

      if (existingAppt) {
        throw new Error('SLOT_ALREADY_BOOKED');
      }

      // Re-verify Redis hold ownership
      const holdData = await redis.get(holdKey);
      if (!holdData) {
        throw new Error('HOLD_EXPIRED');
      }

      const parsedHold = JSON.parse(holdData);
      if (parsedHold.patientId !== session.user.id) {
        throw new Error('HOLD_OWNERSHIP_MISMATCH');
      }

      // Create booking along with nested AI symptom summary mock
      const preVisitSummaryMock = `AI Symptom Analysis: Patient reports "${symptoms}". Clinical evaluation recommended for related concerns.`;
      
      const appt = await tx.appointment.create({
        data: {
          patientId: session.user.id,
          doctorProfileId: doctor.doctorProfile!.id,
          dateTime: parsedDateTime,
          status: AppointmentStatus.BOOKED,
          symptoms,
          aiSummary: {
            create: {
              preVisitSummary: preVisitSummaryMock,
              postVisitSummary: 'Clinical checkup pending. Post-visit summary will be compiled by doctor.',
            },
          },
        },
        include: {
          aiSummary: true,
        },
      });

      return appt;
    });

    // 3. Clear Redis hold key after transaction commits successfully
    await redis.del(holdKey);

    // 4. Dispatch background jobs asynchronously
    await emailQueue.add('send-booking-confirmation', {
      patientEmail: session.user.email,
      doctorEmail: doctor.email,
      patientName: session.user.name,
      doctorName: doctor.name,
      specialization: doctor.doctorProfile.specialization,
      dateTime: parsedDateTime.toISOString(),
    });

    await calendarQueue.add('create-event', {
      appointmentId: newAppointment.id,
      doctorId: doctor.id,
      patientName: session.user.name,
      doctorName: doctor.name,
      specialization: doctor.doctorProfile.specialization,
      dateTime: parsedDateTime.toISOString(),
      symptoms,
    });

    return NextResponse.json(
      { message: 'Appointment booked successfully', appointment: newAppointment },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error booking appointment:', error);

    // Map business errors to proper HTTP statuses
    if (error.message === 'SLOT_ALREADY_BOOKED') {
      return NextResponse.json({ error: 'This slot is already booked' }, { status: 409 });
    }
    if (error.message === 'HOLD_EXPIRED') {
      return NextResponse.json(
        { error: 'Temporary hold has expired. Please select the slot again.' },
        { status: 408 } // Request Timeout or 400 Bad Request
      );
    }
    if (error.message === 'HOLD_OWNERSHIP_MISMATCH') {
      return NextResponse.json(
        { error: 'Slot hold credentials mismatch' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
