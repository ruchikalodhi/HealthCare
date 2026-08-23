import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, AppointmentStatus } from '@prisma/client';
import { emailQueue, calendarQueue } from '@/lib/queue/client';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointmentId = params.id;

    // Load existing appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: { name: true, email: true },
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

    // Verify ownership
    const isPatientOwner = appointment.patientId === session.user.id;
    const isDoctorOwner = appointment.doctorProfile.userId === session.user.id;
    const isAdmin = session.user.role === Role.ADMIN;

    if (!isPatientOwner && !isDoctorOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden. You do not own this appointment.' }, { status: 403 });
    }

    // Update status to CANCELLED
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.CANCELLED,
      },
    });

    // Dispatch background jobs asynchronously: notify the patient and
    // remove the Google Calendar event so both sides' calendars stay in
    // sync with the cancellation.
    await emailQueue.add('send-cancellation-notice', {
      patientEmail: appointment.patient.email,
      patientName: appointment.patient.name,
      doctorName: appointment.doctorProfile.user.name,
      dateTime: appointment.dateTime.toISOString(),
      rebookLink: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/patient/book`,
    });

    if (appointment.googleEventId) {
      await calendarQueue.add('delete-event', {
        googleEventId: appointment.googleEventId,
        doctorId: appointment.doctorProfile.user.id,
      });
    }

    return NextResponse.json({
      message: 'Appointment cancelled successfully',
      appointment: updatedAppointment,
    });
  } catch (error: any) {
    console.error('Error cancelling appointment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
