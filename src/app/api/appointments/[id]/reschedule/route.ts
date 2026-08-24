import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { Role, AppointmentStatus } from '@prisma/client';
import { emailQueue, calendarQueue } from '@/lib/queue/client';

export const dynamic = 'force-dynamic';

/**
 * Reschedules an existing appointment to a new dateTime.
 *
 * Mirrors the safety pattern used by POST /api/slots/book: an atomic Redis
 * `SET NX` hold on the *new* slot to close the check-then-write race window
 * against other patients booking/holding the same slot, re-verified inside
 * a DB transaction, with the `@@unique([doctorProfileId, dateTime])`
 * constraint as the hard backstop if two requests still race past the
 * pre-checks. The hold is released once the transaction commits (or if any
 * step fails).
 *
 * This performs the move immediately (patient picks a new slot, it's
 * applied) rather than introducing a two-phase "request → doctor/admin
 * approval" flow. `AppointmentStatus.PENDING_RESCHEDULE` in the schema is
 * left unused by design: nothing in the brief calls for an approval step,
 * and introducing an intermediate state here would just leave the
 * appointment unresolved for no benefit. If an approval workflow is wanted
 * later, this route is the natural place to set that status instead of
 * writing the new dateTime directly.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const appointmentId = params.id;
  let holdKey: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newDateTime } = await req.json();
    if (!newDateTime) {
      return NextResponse.json({ error: 'newDateTime is required' }, { status: 400 });
    }

    const parsedNewDateTime = new Date(newDateTime);
    if (isNaN(parsedNewDateTime.getTime())) {
      return NextResponse.json({ error: 'Invalid newDateTime format' }, { status: 400 });
    }

    if (parsedNewDateTime.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'New appointment time must be in the future' }, { status: 400 });
    }

    // Load the existing appointment with everything needed for ownership
    // checks, the leave-day check, and the notification payloads below.
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: { id: true, name: true, email: true },
        },
        doctorProfile: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Ownership check — same rule as cancel: the owning patient, the owning
    // doctor, or an admin may reschedule.
    const isPatientOwner = appointment.patientId === session.user.id;
    const isDoctorOwner = appointment.doctorProfile.userId === session.user.id;
    const isAdmin = session.user.role === Role.ADMIN;

    if (!isPatientOwner && !isDoctorOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden. You do not own this appointment.' }, { status: 403 });
    }

    // Only an active, upcoming appointment can be rescheduled.
    if (appointment.status !== AppointmentStatus.BOOKED && appointment.status !== AppointmentStatus.SCHEDULED) {
      return NextResponse.json(
        { error: `Cannot reschedule an appointment with status "${appointment.status}"` },
        { status: 409 }
      );
    }

    if (parsedNewDateTime.getTime() === appointment.dateTime.getTime()) {
      return NextResponse.json({ error: 'New time is the same as the current time' }, { status: 400 });
    }

    // Reject leave days up front — same rule generateAvailableSlots applies,
    // so a reschedule can't land on a day the doctor has since taken leave.
    const dateString = parsedNewDateTime.toISOString().split('T')[0];
    if (appointment.doctorProfile.leaveDays.includes(dateString)) {
      return NextResponse.json(
        { error: 'The doctor is on leave on the selected date' },
        { status: 409 }
      );
    }

    // Reject times outside the doctor's working hours window.
    const timeString = parsedNewDateTime.toISOString().substring(11, 16); // "HH:MM"
    if (
      timeString < appointment.doctorProfile.workingHoursStart ||
      timeString >= appointment.doctorProfile.workingHoursEnd
    ) {
      return NextResponse.json(
        { error: 'The selected time is outside the doctor\'s working hours' },
        { status: 409 }
      );
    }

    // Atomically hold the new slot (same SET NX EX pattern as slots/hold)
    // so a concurrent booking/reschedule for the same slot can't slip in
    // between our pre-check and the write below.
    holdKey = `slot_hold:${appointment.doctorProfile.userId}:${parsedNewDateTime.toISOString()}`;
    const holdValue = JSON.stringify({ patientId: appointment.patientId, timestamp: Date.now(), reschedule: true });
    const acquired = await redis.set(holdKey, holdValue, 'EX', 60, 'NX');

    if (acquired !== 'OK') {
      return NextResponse.json(
        { error: 'This time slot is temporarily held or already booked' },
        { status: 409 }
      );
    }

    const oldDateTime = appointment.dateTime;

    const updatedAppointment = await prisma.$transaction(async (tx) => {
      // Re-verify no other active appointment occupies the target slot
      // (excluding this appointment itself, in case of a no-op edge case).
      const conflict = await tx.appointment.findFirst({
        where: {
          doctorProfileId: appointment.doctorProfileId,
          dateTime: parsedNewDateTime,
          status: { in: ['BOOKED', 'SCHEDULED'] },
          NOT: { id: appointmentId },
        },
      });

      if (conflict) {
        throw new Error('SLOT_ALREADY_BOOKED');
      }

      try {
        return await tx.appointment.update({
          where: { id: appointmentId },
          data: { dateTime: parsedNewDateTime },
        });
      } catch (updateError: any) {
        // Belt-and-suspenders backstop, same as slots/book: the
        // @@unique([doctorProfileId, dateTime]) constraint catches a
        // concurrent write that slipped past the pre-check above.
        if (updateError?.code === 'P2002') {
          throw new Error('SLOT_ALREADY_BOOKED');
        }
        throw updateError;
      }
    });

    // Release the hold now that the new slot is durably assigned to this
    // appointment in Postgres.
    await redis.del(holdKey);
    holdKey = null;

    // Notify both sides and keep the Google Calendar event in sync.
    await emailQueue.add('send-reschedule-notice', {
      patientEmail: appointment.patient.email,
      doctorEmail: appointment.doctorProfile.user.email,
      patientName: appointment.patient.name,
      doctorName: appointment.doctorProfile.user.name,
      oldDateTime: oldDateTime.toISOString(),
      newDateTime: parsedNewDateTime.toISOString(),
    });

    if (appointment.googleEventId) {
      await calendarQueue.add('update-event', {
        googleEventId: appointment.googleEventId,
        doctorId: appointment.doctorProfile.user.id,
        doctorName: appointment.doctorProfile.user.name,
        dateTime: parsedNewDateTime.toISOString(),
        slotDurationMinutes: appointment.doctorProfile.slotDuration,
      });
    }

    return NextResponse.json({
      message: 'Appointment rescheduled successfully',
      appointment: updatedAppointment,
    });
  } catch (error: any) {
    // Always release the hold we took, even on an unexpected failure —
    // otherwise the slot stays artificially locked for up to 60s.
    if (holdKey) {
      await redis.del(holdKey).catch(() => {});
    }

    console.error('Error rescheduling appointment:', error);

    if (error.message === 'SLOT_ALREADY_BOOKED') {
      return NextResponse.json({ error: 'This time slot is already booked' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
