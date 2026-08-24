import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { Role, AppointmentStatus } from '@prisma/client';

import { emailQueue, calendarQueue } from '@/lib/queue/client';
import { generatePreVisitSummary } from '@/lib/ai/summaries';

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

    // 2. Run real AI (or deterministic fallback) triage on the reported
    // symptoms *before* opening the DB transaction, so the LLM round-trip
    // never holds a transaction/lock open. This is what actually populates
    // urgency / chiefComplaint / suggestedQuestions for the doctor's
    // dashboard instead of a static placeholder string.
    const preVisitResult = await generatePreVisitSummary(symptoms);

    // 3. Perform verification and inserts within a database transaction
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

      // Create booking along with the real AI (or fallback) symptom triage
      // computed above, rather than a static placeholder string.
      const preVisitSummaryText = `Pre-visit symptom review. Urgency: ${preVisitResult.urgency}. Complaint: ${preVisitResult.chiefComplaint}`;

      try {
        const appt = await tx.appointment.create({
          data: {
            patientId: session.user.id,
            doctorProfileId: doctor.doctorProfile!.id,
            dateTime: parsedDateTime,
            status: AppointmentStatus.BOOKED,
            symptoms,
            aiSummary: {
              create: {
                urgency: preVisitResult.urgency,
                chiefComplaint: preVisitResult.chiefComplaint,
                suggestedQuestions: preVisitResult.suggestedQuestions,
                isFallback: preVisitResult.isFallback,
                preVisitSummary: preVisitSummaryText,
                postVisitSummary: 'Clinical checkup pending. Post-visit summary will be compiled by doctor.',
              },
            },
          },
          include: {
            aiSummary: true,
          },
        });

        return appt;
      } catch (createError: any) {
        // Belt-and-suspenders: the pre-check above can race under
        // READ COMMITTED, but the @@unique([doctorProfileId, dateTime])
        // DB constraint is the real backstop. A second concurrent insert
        // that slipped past the pre-check fails here with Prisma error
        // P2002, which we map to the same clean SLOT_ALREADY_BOOKED path
        // instead of surfacing a raw 500.
        if (createError?.code === 'P2002') {
          throw new Error('SLOT_ALREADY_BOOKED');
        }
        throw createError;
      }
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
      patientEmail: session.user.email,
      doctorName: doctor.name,
      doctorEmail: doctor.email,
      specialization: doctor.doctorProfile.specialization,
      dateTime: parsedDateTime.toISOString(),
      slotDurationMinutes: doctor.doctorProfile.slotDuration,
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
